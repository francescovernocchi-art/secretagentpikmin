import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { FamilyChatPanel } from "@/components/game/FamilyChatPanel";
import { ParticleEffect } from "@/components/fx/ParticleEffect";
import { gameAudio } from "@/lib/game-audio";
import { triggerGameFx } from "@/lib/game-event-fx";
import { fetchChatMessagesWithLegacy, sendChatMessage, senderDisplayName } from "@/lib/game/chat";
import { agentKeyFromSession } from "@/lib/game/planet";
import type { ChatChannelKey } from "@/types/secretPikmin";
import { Send, Mic, Sparkles } from "lucide-react";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

interface Msg {
  id: string;
  sender: string;
  content: string;
  type: string;
  channel: ChatChannelKey;
  created_at: string;
}

const QUICK = [
  "Missione ricevuta",
  "Agente pronto",
  "Rientro alla base",
  "Base attiva",
  "Pikmin individuato",
];
const STICKERS = ["🟢", "🛰️", "🌱", "🔭", "🕶️", "📡"];

function Decoded({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return <span>{shown}<span className="text-primary animate-flicker">▋</span></span>;
}

function appendUnique(prev: Msg[], row: Msg): Msg[] {
  if (prev.some((m) => m.id === row.id)) return prev;
  return [...prev, row];
}

function ChatPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const myAgent = agentKeyFromSession(session?.role);
  const myAgentRef = useRef(myAgent);
  myAgentRef.current = myAgent;

  const [channel, setChannel] = useState<ChatChannelKey>("famiglia");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async (ch: ChatChannelKey) => {
    const rows = await fetchChatMessagesWithLegacy(ch);
    setMessages(
      rows.map((m) => ({
        id: m.id,
        sender: m.sender_agent,
        content: m.content,
        type: m.message_type,
        channel: m.channel,
        created_at: m.created_at,
      })),
    );
  }, []);

  useEffect(() => {
    gameAudio.play("chat_open");
  }, []);

  useEffect(() => {
    loadMessages(channel);
  }, [channel, loadMessages]);

  useEffect(() => {
    const onFamily = (p: { new: Record<string, string> }) => {
      const raw = p.new;
      const row: Msg = {
        id: raw.id,
        sender: raw.sender_agent ?? raw.sender,
        content: raw.content,
        type: raw.message_type ?? raw.type ?? "text",
        channel: (raw.channel as ChatChannelKey) ?? "famiglia",
        created_at: raw.created_at,
      };
      setMessages((m) => appendUnique(m, row));
      if (row.sender !== myAgentRef.current) triggerGameFx("chat_message");
    };

    const chFamily = supabase
      .channel("family-chat-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "family_chat_messages" }, onFamily)
      .subscribe();

    const chLegacy = supabase
      .channel("messages-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, onFamily)
      .subscribe();

    return () => {
      supabase.removeChannel(chFamily);
      supabase.removeChannel(chLegacy);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, channel]);

  const visible = useMemo(
    () => messages.filter((m) => m.channel === channel),
    [messages, channel],
  );

  const send = async (content: string, type: string = "text", ch: ChatChannelKey = channel) => {
    if (!content.trim() || !session) return;
    setText("");
    const msg = await sendChatMessage({
      channel: ch,
      senderAgent: myAgent,
      content,
      messageType: type,
    });
    setMessages((m) =>
      appendUnique(m, {
        id: msg.id,
        sender: msg.sender_agent,
        content: msg.content,
        type: msg.message_type,
        channel: msg.channel,
        created_at: msg.created_at,
      }),
    );
  };

  return (
    <PageShell title="Chat Segreta" subtitle="Canale criptato · famiglia Comandanti" theme="chat">
      <FamilyChatPanel
        embedded
        showMessages={false}
        channel={channel}
        onChannelChange={setChannel}
        onSend={(t, ch) => send(t, "quick", ch)}
      />

      <div className="panel-strong scanline relative flex flex-col h-[calc(100dvh-420px)] min-h-[240px] overflow-hidden">
        <ParticleEffect variant="chat" density="medium" className="opacity-50" />
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {visible.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-12">
              Nessuna trasmissione in questo canale. Invia il primo segnale.
            </p>
          )}
          <AnimatePresence initial={false}>
            {visible.map((m) => {
              const mine = m.sender === myAgent;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-primary/20 border border-primary/40 text-foreground glow-soft"
                        : "bg-card border border-border text-foreground/90"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-widest text-primary/70 mb-0.5">
                      {senderDisplayName(m.sender)}
                    </p>
                    {m.type === "sticker" ? (
                      <span className="text-3xl">{m.content}</span>
                    ) : m.type === "voice" ? (
                      <span className="flex items-center gap-2 text-primary"><Mic className="h-4 w-4" /> Vocale registrato</span>
                    ) : mine ? (
                      m.content
                    ) : (
                      <Decoded text={m.content} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="border-t border-primary/20 p-2 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q, "quick")}
                className="shrink-0 rounded-full border border-primary/40 px-3 py-1 text-xs text-primary"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {STICKERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s, "sticker")}
                className="shrink-0 h-9 w-9 rounded-lg bg-night/60 border border-border text-xl"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Trasmetti messaggio…"
              className="flex-1 rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => send("Vocale registrato", "voice")}
              className="h-10 w-10 rounded-xl panel flex items-center justify-center text-primary"
              aria-label="Vocale"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button type="submit" className="btn-neon h-10 px-4 flex items-center gap-1 text-sm">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 justify-center">
            <Sparkles className="h-3 w-3 text-primary" /> Decodifica automatica attiva · canale {channel}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
