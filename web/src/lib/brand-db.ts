import { supabase } from "@/lib/supabase";

// ── Brand (extended with brief fields) ───────────────────────────────────────

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  // Brief fields (ARM-80)
  core_values: string | null;
  content_themes: string | null;
  objectives: string | null;
  dislikes: string | null;
  tone_of_voice: string | null;
  competitors: string | null;
  products_services: string | null;
  target_audience: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBrandById(
  id: string,
  userId: string
): Promise<Brand | null> {
  const { data } = await supabase()
    .from("brands")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return data ?? null;
}

export async function updateBrand(
  id: string,
  userId: string,
  patch: Partial<
    Pick<
      Brand,
      | "name"
      | "core_values"
      | "content_themes"
      | "objectives"
      | "dislikes"
      | "tone_of_voice"
      | "competitors"
      | "products_services"
      | "target_audience"
    >
  >
): Promise<Brand | null> {
  const { data } = await supabase()
    .from("brands")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();
  return data ?? null;
}

export async function deleteBrand(id: string, userId: string): Promise<void> {
  await supabase()
    .from("brands")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}

// ── Brand Voice (ARM-85) ──────────────────────────────────────────────────────

export interface BrandVoice {
  id: string;
  brand_id: string;
  tone: string | null;
  style: string | null;
  platform_guidelines: string | null;
  dos_and_donts: string | null;
  sample_copy: string | null;
  competitor_differentiation: string | null;
  created_at: string;
  updated_at: string;
}

export async function getBrandVoice(
  brandId: string
): Promise<BrandVoice | null> {
  const { data } = await supabase()
    .from("brand_voice")
    .select("*")
    .eq("brand_id", brandId)
    .maybeSingle();
  return data ?? null;
}

export async function upsertBrandVoice(
  brandId: string,
  patch: Partial<
    Pick<
      BrandVoice,
      | "tone"
      | "style"
      | "platform_guidelines"
      | "dos_and_donts"
      | "sample_copy"
      | "competitor_differentiation"
    >
  >
): Promise<BrandVoice> {
  const { data, error } = await supabase()
    .from("brand_voice")
    .upsert(
      {
        id: crypto.randomUUID(),
        brand_id: brandId,
        ...patch,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "brand_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as BrandVoice;
}

// ── Brand Publishing Config (ARM-82) ──────────────────────────────────────────

export type PublishFrequency = "daily" | "per_event" | "weekly" | "manual";
export type PostType = "poster" | "caption" | "thread" | "image" | "video";

export interface PlatformPublishingConfig {
  enabled: boolean;
  frequency: PublishFrequency;
  post_types: PostType[];
  timing_rules: string;
  auto_publish: boolean;
}

export interface BrandPublishingConfig {
  id: string;
  brand_id: string;
  config: {
    platforms: Partial<Record<string, PlatformPublishingConfig>>;
  };
  created_at: string;
  updated_at: string;
}

export async function getBrandPublishingConfig(
  brandId: string
): Promise<BrandPublishingConfig | null> {
  const { data } = await supabase()
    .from("brand_publishing_config")
    .select("*")
    .eq("brand_id", brandId)
    .maybeSingle();
  return data ?? null;
}

export async function upsertBrandPublishingConfig(
  brandId: string,
  config: BrandPublishingConfig["config"]
): Promise<BrandPublishingConfig> {
  const { data, error } = await supabase()
    .from("brand_publishing_config")
    .upsert(
      {
        id: crypto.randomUUID(),
        brand_id: brandId,
        config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "brand_id" }
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as BrandPublishingConfig;
}

// ── Brand Credentials (ARM-83) ────────────────────────────────────────────────

export interface BrandCredentialMeta {
  platform: string;
  last_updated_at: string;
  last_used_at: string | null;
}

export interface BrandCredentialRow {
  id: string;
  brand_id: string;
  platform: string;
  encrypted_value: string;
  iv: string;
  last_updated_at: string;
  last_used_at: string | null;
}

export async function listBrandCredentials(
  brandId: string
): Promise<BrandCredentialMeta[]> {
  const { data, error } = await supabase()
    .from("brand_credentials")
    .select("platform, last_updated_at, last_used_at")
    .eq("brand_id", brandId)
    .order("platform");
  if (error) throw new Error(error.message);
  return (data ?? []) as BrandCredentialMeta[];
}

export async function upsertBrandCredential(
  brandId: string,
  platform: string,
  encryptedValue: string,
  iv: string
): Promise<BrandCredentialMeta> {
  const { data, error } = await supabase()
    .from("brand_credentials")
    .upsert(
      {
        brand_id: brandId,
        platform,
        encrypted_value: encryptedValue,
        iv,
        last_updated_at: new Date().toISOString(),
        last_used_at: null,
      },
      { onConflict: "brand_id,platform" }
    )
    .select("platform, last_updated_at, last_used_at")
    .single();
  if (error) throw new Error(error.message);
  return data as BrandCredentialMeta;
}

export async function deleteBrandCredential(
  brandId: string,
  platform: string
): Promise<void> {
  const { error } = await supabase()
    .from("brand_credentials")
    .delete()
    .eq("brand_id", brandId)
    .eq("platform", platform);
  if (error) throw new Error(error.message);
}

export async function getBrandCredentialForDecrypt(
  brandId: string,
  platform: string
): Promise<BrandCredentialRow | null> {
  const { data } = await supabase()
    .from("brand_credentials")
    .select("*")
    .eq("brand_id", brandId)
    .eq("platform", platform)
    .maybeSingle();
  return data ?? null;
}

export async function touchBrandCredentialUsed(id: string): Promise<void> {
  await supabase()
    .from("brand_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", id);
}

// ── Brand Templates (ARM-84) ──────────────────────────────────────────────────

export type TemplateKind = "poster" | "caption";

export interface BrandTemplate {
  id: string;
  brand_id: string;
  kind: TemplateKind;
  poster_type: string | null;
  platform: string | null;
  name: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listBrandTemplates(
  brandId: string,
  kind?: TemplateKind
): Promise<BrandTemplate[]> {
  let query = supabase()
    .from("brand_templates")
    .select("*")
    .eq("brand_id", brandId)
    .order("kind")
    .order("name");
  if (kind) {
    query = query.eq("kind", kind) as typeof query;
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as BrandTemplate[];
}

export async function createBrandTemplate(
  brandId: string,
  fields: Pick<
    BrandTemplate,
    "kind" | "name" | "content" | "poster_type" | "platform"
  >
): Promise<BrandTemplate> {
  const { data, error } = await supabase()
    .from("brand_templates")
    .insert({
      id: crypto.randomUUID(),
      brand_id: brandId,
      ...fields,
      is_active: false,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as BrandTemplate;
}

export async function getTemplate(
  templateId: string
): Promise<BrandTemplate | null> {
  const { data } = await supabase()
    .from("brand_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();
  return data ?? null;
}

export async function updateTemplate(
  templateId: string,
  patch: Partial<
    Pick<BrandTemplate, "name" | "content" | "poster_type" | "platform" | "is_active">
  >
): Promise<BrandTemplate | null> {
  const { data, error } = await supabase()
    .from("brand_templates")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function deactivateTemplatesInScope(
  brandId: string,
  kind: TemplateKind,
  posterType: string | null,
  platform: string | null,
  excludeId: string
): Promise<void> {
  let query = supabase()
    .from("brand_templates")
    .update({ is_active: false })
    .eq("brand_id", brandId)
    .eq("kind", kind)
    .neq("id", excludeId);

  if (kind === "poster" && posterType) {
    query = query.eq("poster_type", posterType) as typeof query;
  } else if (kind === "caption" && platform) {
    query = query.eq("platform", platform) as typeof query;
  }

  await query;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase()
    .from("brand_templates")
    .delete()
    .eq("id", templateId);
  if (error) throw new Error(error.message);
}
