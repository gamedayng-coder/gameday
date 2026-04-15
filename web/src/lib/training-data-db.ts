import { supabase } from "@/lib/supabase";

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type ContentType = "post" | "caption" | "poster" | "competitor" | "inspiration";
export type Sentiment = "positive" | "negative";

export interface TrainingDataItem {
  id: string;
  brand_id: string;
  user_id: string;
  content_type: ContentType;
  content: string;
  platform: string | null;
  tone: string | null;
  campaign: string | null;
  sentiment: Sentiment;
  source_url: string | null;
  created_at: string;
}

// ── Brands ────────────────────────────────────────────────────────────────────

export async function getBrands(userId: string): Promise<Brand[]> {
  const { data, error } = await supabase()
    .from("brands")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getBrand(id: string, userId: string): Promise<Brand | null> {
  const { data, error } = await supabase()
    .from("brands")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function createBrand(id: string, userId: string, name: string): Promise<Brand> {
  const { data, error } = await supabase()
    .from("brands")
    .insert({ id, user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBrand(id: string, userId: string): Promise<void> {
  const { error } = await supabase()
    .from("brands")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── Training data ─────────────────────────────────────────────────────────────

export async function getTrainingData(
  brandId: string,
  userId: string,
  filters?: { content_type?: string; platform?: string; sentiment?: string }
): Promise<TrainingDataItem[]> {
  let query = supabase()
    .from("training_data_items")
    .select("*")
    .eq("brand_id", brandId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (filters?.content_type) query = query.eq("content_type", filters.content_type);
  if (filters?.platform) query = query.eq("platform", filters.platform);
  if (filters?.sentiment) query = query.eq("sentiment", filters.sentiment);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createTrainingDataItem(
  id: string,
  brandId: string,
  userId: string,
  item: {
    content_type: ContentType;
    content: string;
    platform?: string | null;
    tone?: string | null;
    campaign?: string | null;
    sentiment?: Sentiment;
    source_url?: string | null;
  }
): Promise<TrainingDataItem> {
  const { data, error } = await supabase()
    .from("training_data_items")
    .insert({
      id,
      brand_id: brandId,
      user_id: userId,
      content_type: item.content_type,
      content: item.content,
      platform: item.platform ?? null,
      tone: item.tone ?? null,
      campaign: item.campaign ?? null,
      sentiment: item.sentiment ?? "positive",
      source_url: item.source_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrainingDataItem(id: string, userId: string): Promise<void> {
  const { error } = await supabase()
    .from("training_data_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
