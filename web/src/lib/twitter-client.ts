import { TwitterApi } from "twitter-api-v2";
import { getTwitterCredential, updateTwitterTokens } from "@/lib/twitter-db";

export function getTwitterAppClient(): TwitterApi {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Twitter API credentials not configured (TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET)");
  }
  return new TwitterApi({ clientId, clientSecret });
}

// Returns a user-context client for the given user, refreshing the access token if near expiry.
export async function getTwitterUserClient(userId: string): Promise<TwitterApi> {
  const cred = await getTwitterCredential(userId);
  if (!cred) throw new Error("No Twitter account connected");

  // Refresh if the token expires within the next 60 seconds
  if (cred.refresh_token && cred.expires_at) {
    const expiresAt = new Date(cred.expires_at);
    if (expiresAt.getTime() - Date.now() < 60_000) {
      const appClient = getTwitterAppClient();
      const refreshed = await appClient.refreshOAuth2Token(cred.refresh_token);
      const newExpiresAt = refreshed.expiresIn
        ? new Date(Date.now() + refreshed.expiresIn * 1000)
        : null;
      await updateTwitterTokens(
        cred.id,
        refreshed.accessToken,
        refreshed.refreshToken ?? null,
        newExpiresAt
      );
      return new TwitterApi(refreshed.accessToken);
    }
  }

  return new TwitterApi(cred.access_token);
}
