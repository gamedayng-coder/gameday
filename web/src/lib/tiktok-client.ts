import { createHash, randomBytes } from "crypto";
import fs from "fs";
import { getTikTokCredential, updateTikTokTokens } from "@/lib/tiktok-db";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

export function getTikTokConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_ID;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    throw new Error(
      "TikTok API credentials not configured (TIKTOK_CLIENT_ID / TIKTOK_CLIENT_SECRET)"
    );
  }
  return { clientKey, clientSecret };
}

// Generate a PKCE code_verifier and code_challenge (S256).
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function buildTikTokAuthUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string
): string {
  const { clientKey } = getTikTokConfig();
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: "user.info.basic,video.publish",
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTikTokCode(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ accessToken: string; refreshToken: string | null; expiresIn: number; openId: string }> {
  const { clientKey, clientSecret } = getTikTokConfig();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(
      `TikTok token exchange failed: ${data.error_description ?? data.error ?? JSON.stringify(data)}`
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 86400,
    openId: data.open_id ?? "",
  };
}

export async function refreshTikTokToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string | null; expiresIn: number }> {
  const { clientKey, clientSecret } = getTikTokConfig();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    throw new Error(
      `TikTok token refresh failed: ${data.error_description ?? data.error ?? JSON.stringify(data)}`
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 86400,
  };
}

export async function getTikTokUserInfo(
  accessToken: string,
  openId: string
): Promise<{ openId: string; displayName: string }> {
  const res = await fetch(
    `${TIKTOK_API_BASE}/user/info/?fields=open_id,display_name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json() as {
    data?: { user?: { open_id?: string; display_name?: string } };
    error?: { code?: string; message?: string };
  };

  if (data.error?.code && data.error.code !== "ok") {
    throw new Error(`TikTok user info failed: ${data.error.message ?? data.error.code}`);
  }

  return {
    openId: data.data?.user?.open_id ?? openId,
    displayName: data.data?.user?.display_name ?? "TikTok User",
  };
}

// Ensure we have a valid (non-expired) access token, refreshing if needed.
// Returns the active access token.
async function getValidAccessToken(): Promise<string> {
  const cred = await getTikTokCredential();
  if (!cred) throw new Error("No TikTok account connected");

  if (cred.expires_at && cred.refresh_token) {
    const expiresAt = new Date(cred.expires_at);
    // Refresh if expiring within 60 seconds
    if (expiresAt.getTime() - Date.now() < 60_000) {
      const tokens = await refreshTikTokToken(cred.refresh_token);
      const newExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      await updateTikTokTokens(cred.id, tokens.accessToken, tokens.refreshToken, newExpiresAt);
      return tokens.accessToken;
    }
  }

  return cred.access_token;
}

// Post a photo to TikTok using the Content Posting API (FILE_UPLOAD).
// imagePath must be a readable local file. Returns the publish_id.
export async function postTikTokPhoto(
  caption: string,
  imagePath: string
): Promise<string> {
  const accessToken = await getValidAccessToken();

  // Step 1: Initialize the photo post
  const initRes = await fetch(`${TIKTOK_API_BASE}/post/publish/content/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: caption.slice(0, 2200), // TikTok caption limit
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        auto_add_music: true,
      },
      source_info: {
        source: "FILE_UPLOAD",
        photo_cover_index: 0,
        photo_count: 1,
      },
      media_type: "PHOTO",
      post_mode: "DIRECT_POST",
    }),
  });

  const initData = await initRes.json() as {
    data?: { publish_id?: string; upload_url?: string };
    error?: { code?: string; message?: string };
  };

  if (initData.error?.code && initData.error.code !== "ok") {
    throw new Error(
      `TikTok photo init failed: ${initData.error.message ?? initData.error.code}`
    );
  }

  const publishId = initData.data?.publish_id;
  const uploadUrl = initData.data?.upload_url;

  if (!publishId || !uploadUrl) {
    throw new Error(
      `TikTok photo init returned unexpected response: ${JSON.stringify(initData)}`
    );
  }

  // Step 2: Upload the image to the provided upload URL
  const imageBuffer = fs.readFileSync(imagePath);
  const imageSize = imageBuffer.length;

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(imageSize),
      "Content-Range": `bytes 0-${imageSize - 1}/${imageSize}`,
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`TikTok image upload failed (${uploadRes.status}): ${text}`);
  }

  return publishId;
}
