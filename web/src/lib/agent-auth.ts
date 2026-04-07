import { NextRequest } from "next/server";
import { findAgentKeyByHash } from "@/lib/db";
import { createHash } from "crypto";

export interface AgentIdentity {
  keyId: string;
  userId: string;
}

export async function validateAgentRequest(req: NextRequest): Promise<AgentIdentity | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // If AGENT_API_KEY env var is set, use it as the sole valid key.
  const envKey = process.env.AGENT_API_KEY;
  if (envKey) {
    if (token !== envKey) return null;
    return { keyId: "env-key", userId: "demo-account-001" };
  }

  const keyHash = createHash("sha256").update(token).digest("hex");
  const key = await findAgentKeyByHash(keyHash);
  if (!key) return null;
  return { keyId: key.id, userId: key.user_id };
}
