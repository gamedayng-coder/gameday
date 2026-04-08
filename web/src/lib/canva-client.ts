// Canva Connect API wrapper
// Docs: https://www.canva.dev/docs/connect/
//
// Required env vars:
//   CANVA_CLIENT_ID     — OAuth client ID from Canva Developer Portal
//   CANVA_CLIENT_SECRET — OAuth client secret
//
// Template IDs are also configurable per template type (see getTemplateId).
// These must be created in Canva and their IDs set via env vars before
// the generate endpoint can produce real designs.

import crypto from "crypto";

const CANVA_BASE_URL = "https://api.canva.com";
const CANVA_AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const CANVA_TOKEN_URL = `${CANVA_BASE_URL}/rest/v1/oauth/token`;

export type CanvaTemplateType = "game_day" | "result" | "weekly_schedule" | "general";

// Maps template types to Canva brand template IDs (set via env vars).
// The env var naming convention is CANVA_TEMPLATE_{TYPE} in uppercase.
export function getTemplateId(type: CanvaTemplateType): string | undefined {
  const key = `CANVA_TEMPLATE_${type.toUpperCase()}`;
  return process.env[key] ?? undefined;
}

function getClientId(): string {
  const id = process.env.CANVA_CLIENT_ID;
  if (!id) throw new Error("CANVA_CLIENT_ID is not set");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.CANVA_CLIENT_SECRET;
  if (!secret) throw new Error("CANVA_CLIENT_SECRET is not set");
  return secret;
}

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ── OAuth URL generation ──────────────────────────────────────────────────────

export interface CanvaAuthLinkResult {
  url: string;
  codeVerifier: string;
  state: string;
}

export function generateOAuthLink(redirectUri: string): CanvaAuthLinkResult {
  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: redirectUri,
    scope: [
      "asset:read",
      "asset:write",
      "brandtemplate:content:read",
      "brandtemplate:meta:read",
      "design:content:read",
      "design:content:write",
      "design:meta:read",
      "profile:read",
    ].join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return { url: `${CANVA_AUTH_URL}?${params.toString()}`, codeVerifier, state };
}

// ── Token exchange ────────────────────────────────────────────────────────────

export interface CanvaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

async function fetchToken(body: Record<string, string>): Promise<CanvaTokenResponse> {
  const credentials = Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64");
  const res = await fetch(CANVA_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canva token error ${res.status}: ${text}`);
  }
  return res.json() as Promise<CanvaTokenResponse>;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<CanvaTokenResponse> {
  return fetchToken({
    grant_type: "authorization_code",
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });
}

export async function refreshAccessToken(refreshToken: string): Promise<CanvaTokenResponse> {
  return fetchToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

// ── REST API calls ────────────────────────────────────────────────────────────

async function canvaFetch<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${CANVA_BASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canva API error ${res.status} on ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface CanvaProfile {
  user: { id: string; display_name: string };
}

export async function getProfile(accessToken: string): Promise<CanvaProfile> {
  return canvaFetch<CanvaProfile>("/users/me/profile", accessToken);
}

// ── Design autofill (template → new design with injected data) ────────────────
// Canva autofill takes a brand template and fills its data fields.
// This is the primary way to programmatically generate designs from templates.

export type AutofillDataset = Record<string, { type: "text"; text: string } | { type: "image"; asset_id: string }>;

export interface AutofillJobResponse {
  job: {
    id: string;
    status: "pending" | "success" | "failed";
    result?: { type: "create_design"; design: { id: string; urls: { view_url: string; edit_url: string } } };
    error?: { code: string; message: string };
  };
}

export async function createAutofillJob(
  accessToken: string,
  brandTemplateId: string,
  title: string,
  data: AutofillDataset
): Promise<AutofillJobResponse> {
  return canvaFetch<AutofillJobResponse>("/autofills", accessToken, {
    method: "POST",
    body: JSON.stringify({ brand_template_id: brandTemplateId, title, data }),
  });
}

export async function getAutofillJob(
  accessToken: string,
  jobId: string
): Promise<AutofillJobResponse> {
  return canvaFetch<AutofillJobResponse>(`/autofills/${jobId}`, accessToken);
}

// ── Export ────────────────────────────────────────────────────────────────────

export interface ExportJobResponse {
  job: {
    id: string;
    status: "pending" | "success" | "failed";
    urls?: string[];
    error?: { code: string; message: string };
  };
}

export async function createExportJob(
  accessToken: string,
  designId: string,
  format: "png" | "jpg" = "png"
): Promise<ExportJobResponse> {
  return canvaFetch<ExportJobResponse>("/exports", accessToken, {
    method: "POST",
    body: JSON.stringify({
      design_id: designId,
      format: { type: format },
    }),
  });
}

export async function getExportJob(
  accessToken: string,
  jobId: string
): Promise<ExportJobResponse> {
  return canvaFetch<ExportJobResponse>(`/exports/${jobId}`, accessToken);
}

// ── Asset upload ──────────────────────────────────────────────────────────────

export interface AssetUploadResponse {
  job: {
    id: string;
    status: "pending" | "success" | "failed";
    asset?: { id: string; name: string };
    error?: { code: string; message: string };
  };
}

export async function uploadAsset(
  accessToken: string,
  name: string,
  imageBuffer: Buffer,
  mimeType: "image/png" | "image/jpeg"
): Promise<AssetUploadResponse> {
  // Asset upload uses a multipart form; skip the JSON helper
  const form = new FormData();
  form.append("asset_upload_metadata", JSON.stringify({ name_base64: Buffer.from(name).toString("base64") }));
  form.append("asset", new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), name);

  const res = await fetch(`${CANVA_BASE_URL}/rest/v1/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canva asset upload error ${res.status}: ${text}`);
  }
  return res.json() as Promise<AssetUploadResponse>;
}

// ── Polling helper ────────────────────────────────────────────────────────────

// Polls a Canva async job until it succeeds or fails (max ~30s).
export async function pollJob<T extends { job: { status: string } }>(
  fetcher: () => Promise<T>,
  intervalMs = 1500,
  maxAttempts = 20
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await fetcher();
    if (result.job.status !== "pending") return result;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Canva job timed out after polling");
}

// ── High-level: generate design from event data ───────────────────────────────
// Builds the autofill dataset from structured event data, runs the autofill,
// then exports the design to PNG. Returns the exported image URL from Canva CDN.

export interface EventDesignData {
  templateType: CanvaTemplateType;
  title?: string;
  homeTeam?: string;
  awayTeam?: string;
  score?: string;        // e.g. "2-1"
  matchDate?: string;    // ISO date string
  matchTime?: string;    // e.g. "15:00 UTC"
  competition?: string;
  venue?: string;
  weekLabel?: string;    // for weekly_schedule type
}

export async function generateDesign(
  accessToken: string,
  data: EventDesignData
): Promise<{ designId: string; viewUrl: string; exportUrl: string }> {
  const templateId = getTemplateId(data.templateType);
  if (!templateId) {
    throw new Error(
      `No Canva template configured for type "${data.templateType}". ` +
      `Set CANVA_TEMPLATE_${data.templateType.toUpperCase()} env var.`
    );
  }

  // Build autofill dataset from event data
  const dataset: AutofillDataset = {};
  if (data.homeTeam) dataset["home_team"] = { type: "text", text: data.homeTeam };
  if (data.awayTeam) dataset["away_team"] = { type: "text", text: data.awayTeam };
  if (data.score) dataset["score"] = { type: "text", text: data.score };
  if (data.matchDate) dataset["match_date"] = { type: "text", text: data.matchDate };
  if (data.matchTime) dataset["match_time"] = { type: "text", text: data.matchTime };
  if (data.competition) dataset["competition"] = { type: "text", text: data.competition };
  if (data.venue) dataset["venue"] = { type: "text", text: data.venue };
  if (data.weekLabel) dataset["week_label"] = { type: "text", text: data.weekLabel };

  const designTitle = data.title ?? `${data.templateType} — ${data.homeTeam ?? ""} ${data.matchDate ?? ""}`.trim();

  // Step 1: Create autofill job
  const autofillResponse = await createAutofillJob(accessToken, templateId, designTitle, dataset);
  const completedAutofill = await pollJob(() => getAutofillJob(accessToken, autofillResponse.job.id));

  if (completedAutofill.job.status !== "success" || !completedAutofill.job.result) {
    throw new Error(`Canva autofill failed: ${completedAutofill.job.error?.message ?? "unknown"}`);
  }

  const design = completedAutofill.job.result.design;

  // Step 2: Export the filled design to PNG
  const exportResponse = await createExportJob(accessToken, design.id, "png");
  const completedExport = await pollJob(() => getExportJob(accessToken, exportResponse.job.id));

  if (completedExport.job.status !== "success" || !completedExport.job.urls?.length) {
    throw new Error(`Canva export failed: ${completedExport.job.error?.message ?? "unknown"}`);
  }

  return {
    designId: design.id,
    viewUrl: design.urls.view_url,
    exportUrl: completedExport.job.urls[0],
  };
}
