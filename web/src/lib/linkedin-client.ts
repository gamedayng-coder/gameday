import { getLinkedInCredential } from "@/lib/linkedin-db";

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn API credentials not configured (LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET)");
  }
  return { clientId, clientSecret };
}

export function buildLinkedInAuthUrl(callbackUrl: string, state: string): string {
  const { clientId } = getLinkedInConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    state,
    scope: "openid profile w_member_social",
  });
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  code: string,
  callbackUrl: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret } = getLinkedInConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn token exchange failed: ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

export async function getLinkedInUserInfo(
  accessToken: string
): Promise<{ sub: string; name: string }> {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn userinfo failed: ${text}`);
  }

  const data = await res.json() as { sub: string; name: string };
  return { sub: data.sub, name: data.name };
}

// Post a text update to LinkedIn as the authenticated member.
// Returns the URN of the created post (e.g. "urn:li:share:123456").
export async function postToLinkedIn(userId: string, content: string): Promise<string> {
  const cred = await getLinkedInCredential(userId);
  if (!cred) throw new Error("No LinkedIn account connected");

  const authorUrn = `urn:li:person:${cred.linkedin_user_id}`;

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cred.access_token}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn post failed (${res.status}): ${text}`);
  }

  // LinkedIn returns the post URN in the X-RestLi-Id header
  const postId = res.headers.get("x-restli-id") ?? res.headers.get("X-RestLi-Id");
  if (!postId) {
    // Fallback: parse from Location or response body
    const data = await res.json().catch(() => ({})) as { id?: string };
    return data.id ?? "unknown";
  }
  return postId;
}
