import { supabase } from "@/integrations/supabase/client";
import type { DataSource } from "@/types/phase2-db";

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL || (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined);
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined);
  return !!(url && key);
}

export function agentKeyFromSession(role?: string | null): string {
  if (role === "papa") return "papa";
  if (role === "lorenzo") return "lorenzo";
  return role ?? "lorenzo";
}

export async function withFallback<T>(
  query: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<{ data: T; source: DataSource }> {
  if (!isSupabaseConfigured()) {
    return { data: await fallback(), source: "local" };
  }
  try {
    const data = await query();
    return { data, source: "supabase" };
  } catch (err) {
    console.warn("[game/db] Supabase unavailable, using local fallback", err);
    return { data: await fallback(), source: "local" };
  }
}

/** Typed table access — Phase 2 tables not yet in generated types */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gameTable(name: string): any {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase not configured");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(name);
}

export async function safeGameQuery<T>(
  query: () => Promise<{ data: T | null; error: unknown }>,
  fallback: () => T | Promise<T>,
): Promise<{ data: T; source: DataSource }> {
  return withFallback(async () => {
    const { data, error } = await query();
    if (error) throw error;
    if (data === null) return await fallback();
    return data;
  }, fallback);
}
