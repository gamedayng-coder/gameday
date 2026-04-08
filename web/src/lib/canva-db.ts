import { supabase } from "@/lib/supabase";

export interface CanvaCredential {
  id: number;
  user_id: string;
  canva_user_id: string;
  display_name: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCanvaCredential(userId: string): Promise<CanvaCredential | undefined> {
  const { data } = await supabase()
    .from("canva_credentials")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? undefined;
}

export async function upsertCanvaCredential(
  userId: string,
  canvaUserId: string,
  displayName: string | null,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): Promise<CanvaCredential> {
  await supabase().from("canva_credentials").delete().eq("user_id", userId);
  const { data, error } = await supabase()
    .from("canva_credentials")
    .insert({
      user_id: userId,
      canva_user_id: canvaUserId,
      display_name: displayName,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCanvaTokens(
  id: number,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null
): Promise<void> {
  const { error } = await supabase()
    .from("canva_credentials")
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCanvaCredential(userId: string): Promise<void> {
  await supabase().from("canva_credentials").delete().eq("user_id", userId);
}

// Returns a valid access token, refreshing if needed.
// Throws if no credential exists or refresh fails.
export async function getValidCanvaToken(userId: string): Promise<{ credential: CanvaCredential; accessToken: string }> {
  const credential = await getCanvaCredential(userId);
  if (!credential) throw new Error("No Canva account connected");

  // Refresh if expires within 5 minutes
  if (credential.expires_at && credential.refresh_token) {
    const expiresAt = new Date(credential.expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (expiresAt < fiveMinutesFromNow) {
      const { refreshAccessToken } = await import("@/lib/canva-client");
      const tokens = await refreshAccessToken(credential.refresh_token);
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      await updateCanvaTokens(credential.id, tokens.access_token, tokens.refresh_token ?? null, newExpiresAt);
      return { credential, accessToken: tokens.access_token };
    }
  }

  return { credential, accessToken: credential.access_token };
}
