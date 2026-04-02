import { createHash } from "crypto";
import { findAgentKeyByHash } from "@/lib/db";
import type { NextRequest } from "next/server";

export interface AgentIdentity {
  keyId: string;
  userId: string;
}

/**
 * Validates an agent API request.
 *
 * Accepts a Bearer token in the Authorization header.
 * The token is hashed with SHA-256 and looked up in agent_api_keys.
 *
 * AGENT_API_KEY env var takes precedence: if set, that raw key is the only
 * valid key and it resolves to the demo user (demo-account-001).
 */
export function validateAgentRequest(req: NextRequest): AgentIdentity | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // If AGENT_API_KEY env var is set, use it as the sole valid key.
  const envKey = process.env.AGENT_API_KEY;
  if (envKey) {
    if (token !== envKey) return null;
    return { keyId: "env-key", userId: "demo-account-001" };
  }

  // Otherwise look up the hashed token in DB.
  const hash = createHash("sha256").update(token).digest("hex");
  const record = findAgentKeyByHash(hash);
  if (!record) return null;

  return { keyId: record.id, userId: record.user_id };
}
