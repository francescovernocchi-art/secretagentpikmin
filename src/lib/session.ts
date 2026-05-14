import { supabase } from "@/integrations/supabase/client";

export type Role = "papa" | "lorenzo";

const KEY = "pikmin.session.v1";

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

export function clearSession() {
  localStorage.removeItem(KEY);
}

export async function loginWithPin(pin: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, role, emoji")
    .eq("pin", pin)
    .maybeSingle();
  if (error || !data) return null;
  const session: Session = {
    role: data.role as Role,
    name: data.name,
    emoji: data.emoji ?? undefined,
    agentId: data.id,
    loggedAt: Date.now(),
  };
  setSession(session);
  return session;
}
