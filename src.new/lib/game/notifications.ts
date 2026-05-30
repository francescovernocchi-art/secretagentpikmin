import { gameTable, isSupabaseConfigured } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import type { DbGameNotification, GameNotificationKind } from "@/types/phase4-db";

export async function pushGameNotification(opts: {
  agentKey: string;
  kind: GameNotificationKind | string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}): Promise<DbGameNotification> {
  const row: DbGameNotification = {
    id: crypto.randomUUID(),
    agent_key: opts.agentKey,
    kind: opts.kind,
    title: opts.title,
    body: opts.body ?? null,
    payload: opts.payload ?? {},
    read_at: null,
    created_at: new Date().toISOString(),
  };

  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await gameTable("game_notifications").insert({
        agent_key: row.agent_key,
        kind: row.kind,
        title: row.title,
        body: row.body,
        payload: row.payload,
      }).select("*").single();
      if (error) throw error;
      return data as DbGameNotification;
    }
  } catch {}

  localStore.addGameNotification(row);

  // Also write mission_notifications for compat with existing UI
  try {
    if (isSupabaseConfigured()) {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("mission_notifications").insert({
        agent: opts.agentKey,
        kind: opts.kind,
        payload: { title: opts.title, body: opts.body, ...opts.payload },
      });
    }
  } catch {}

  return row;
}

export async function fetchGameNotifications(agentKey: string, unreadOnly = false): Promise<DbGameNotification[]> {
  try {
    if (isSupabaseConfigured()) {
      let q = gameTable("game_notifications").select("*").eq("agent_key", agentKey).order("created_at", { ascending: false }).limit(50);
      if (unreadOnly) q = q.is("read_at", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DbGameNotification[];
    }
  } catch {}
  const all = localStore.getGameNotifications(agentKey);
  return unreadOnly ? all.filter((n) => !n.read_at) : all;
}

export async function markNotificationRead(id: string, agentKey: string): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      await gameTable("game_notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      return;
    }
  } catch {}
  localStore.markNotificationRead(id, agentKey);
}

export async function markAllNotificationsRead(agentKey: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    if (isSupabaseConfigured()) {
      await gameTable("game_notifications").update({ read_at: now }).eq("agent_key", agentKey).is("read_at", null);
      return;
    }
  } catch {}
  localStore.markAllNotificationsRead(agentKey);
}

export function unreadCount(notifications: DbGameNotification[]): number {
  return notifications.filter((n) => !n.read_at).length;
}
