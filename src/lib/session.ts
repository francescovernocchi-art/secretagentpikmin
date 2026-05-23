import { supabase } from "@/integrations/supabase/client";

export type Role = "papa" | "lorenzo";

const KEY = "pikmin.session.v2";

export interface Session {
  role: Role;
  name: string;
  emoji?: string;
  agentId?: string; // = auth user id
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

export async function signInWithPassword(email: string, password: string): Promise<Session | null> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error("Login fallito");
  return hydrateProfile(data.user.id);
}

export async function signUpWithPassword(args: {
  email: string;
  password: string;
  name: string;
  role: Role;
  emoji: string;
}): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email: args.email,
    password: args.password,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      data: {
        name: args.name,
        agent_key: args.role,
        emoji: args.emoji,
      },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error("Signup non confermato");
  // if auto-confirm is on, session is set; otherwise user must confirm via email
  if (data.session) {
    return hydrateProfile(data.user.id);
  }
  return null;
}
