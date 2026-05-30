import { supabase } from "@/integrations/supabase/client";

export type Role = "papa" | "lorenzo";

const KEY = "pikmin.session.v2";
export const FAMILY_EMAIL_DOMAIN = "famiglia.pikmin";

export interface Session {
  role: Role;
  name: string;
  emoji?: string;
  agentId?: string;
  loggedAt: number;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(s: Session) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearStoredSession() {
  localStorage.removeItem(KEY);
}

export function clearSession() {
  clearStoredSession();
  void supabase.auth.signOut();
}

async function hydrateProfile(userId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("agent_key, name, emoji")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  const session: Session = {
    role: data.agent_key as Role,
    name: data.name,
    emoji: data.emoji ?? undefined,
    agentId: userId,
    loggedAt: Date.now(),
  };
  setSession(session);
  return session;
}

export async function refreshSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    clearStoredSession();
    return null;
  }
  return hydrateProfile(data.user.id);
}

export async function signInWithEmail(email: string, password: string): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error("Login fallito");
  return hydrateProfile(data.user.id);
}

export async function signInWithUsername(
  username: string,
  password: string,
): Promise<Session | null> {
  const u = username.trim().toLowerCase();
  if (!u) throw new Error("Inserisci il nome agente");
  return signInWithEmail(`${u}@${FAMILY_EMAIL_DOMAIN}`, password);
}

/** Genera password "umana" da condividere a voce. */
export function generateMemorablePassword(): string {
  const adj = ["rapido", "felpato", "ombra", "lampo", "stellare", "siberiano", "audace", "calmo"];
  const noun = ["pikmin", "radar", "cobalto", "vulcano", "atomo", "drone", "falco", "nebbia"];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = noun[Math.floor(Math.random() * noun.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${a}-${n}-${num}`;
}
