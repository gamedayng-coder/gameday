import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { data } = await supabase()
    .from("users")
    .select("*")
    .eq("email", email)
    .single();
  return data ?? undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const { data } = await supabase()
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? undefined;
}

export async function createUser(
  id: string,
  email: string,
  passwordHash: string,
  name: string | null
): Promise<User> {
  const { data, error } = await supabase()
    .from("users")
    .insert({ id, email, password_hash: passwordHash, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface AgentApiKey {
  id: string;
  key_hash: string;
  name: string;
  user_id: string;
  created_at: string;
}

export async function findAgentKeyByHash(keyHash: string): Promise<AgentApiKey | undefined> {
  const { data } = await supabase()
    .from("agent_api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .single();
  return data ?? undefined;
}
