import { gameTable, safeGameQuery } from "@/lib/game/db";
import { localStore } from "@/lib/game/local-store";
import type { DbChatMessage } from "@/types/phase2-db";
import type { ChatChannelKey } from "@/types/secretPikmin";
import { supabase } from "@/integrations/supabase/client";
import { isSupabaseConfigured } from "@/lib/game/db";

export async function fetchChatMessages(channel?: ChatChannelKey): Promise<{ data: DbChatMessage[]; source: "supabase" | "local" }> {
  const res = await safeGameQuery(
    () => {
      let q = gameTable("family_chat_messages").select("*").order("created_at", { ascending: true }).limit(200);
      if (channel) q = q.eq("channel", channel);
      return q;
    },
    () => localStore.getChat(channel),
  );
  return { data: res.data as DbChatMessage[], source: res.source };
}

/** Fallback to legacy messages table if family_chat_messages empty */
export async function fetchChatMessagesWithLegacy(channel?: ChatChannelKey): Promise<DbChatMessage[]> {
  const { data } = await fetchChatMessages(channel);
  if (data.length > 0) return data;

  if (!isSupabaseConfigured()) return data;

  try {
    const { data: legacy } = await supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(200);
    return (legacy ?? []).map((m) => ({
      id: m.id,
      channel: "famiglia" as ChatChannelKey,
      sender_agent: m.sender,
      content: m.content,
      message_type: m.type,
      created_at: m.created_at,
    }));
  } catch {
    return data;
  }
}

export async function sendChatMessage(opts: {
  channel: ChatChannelKey;
  senderAgent: string;
  content: string;
  messageType?: string;
}): Promise<DbChatMessage> {
  const row = {
    channel: opts.channel,
    sender_agent: opts.senderAgent,
    content: opts.content,
    message_type: opts.messageType ?? "text",
  };

  try {
    const { data, error } = await gameTable("family_chat_messages").insert(row).select("*").single();
    if (error) throw error;
    return data as DbChatMessage;
  } catch {
    const msg: DbChatMessage = {
      id: crypto.randomUUID(),
      ...row,
      created_at: new Date().toISOString(),
    };
    localStore.addChat(msg);
    // Also write legacy for compat
    if (isSupabaseConfigured()) {
      try {
        await supabase.from("messages").insert({
          sender: opts.senderAgent,
          content: opts.content,
          type: opts.messageType ?? "text",
        });
      } catch {}
    }
    return msg;
  }
}

export function senderDisplayName(agent: string): string {
  if (agent === "papa") return "Francesco";
  if (agent === "lorenzo") return "Lorenzo";
  return agent;
}
