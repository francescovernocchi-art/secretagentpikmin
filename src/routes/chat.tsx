import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { Send, Mic, Sparkles } from "lucide-react";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

interface Msg {
  id: string;
  sender: string;
  content: string;
  type: string;
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

function ChatPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => setMessages((data ?? []) as Msg[]));

    const ch = supabase
      .channel("messages-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        setMessages((m) => [...m, p.new as Msg]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (content: string, type: string = "text") => {
    if (!content.trim() || !session) return;
    setText("");
    await supabase.from("messages").insert({ sender: session.role, content, type });
  };

  return (
    <PageShell title="Chat Segreta" subtitle="Canale criptato · solo team">
      <div className="panel-strong scanline flex flex-col h-[calc(100vh-260px)] overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
          {messages.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-12">
              Nessuna trasmissione. Invia il primo segnale.
            </p>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const mine = m.sender === session?.role;
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
                      {m.sender === "papa" ? "Papà" : "Lorenzo"}
                    </p>
                    {m.type === "sticker" ? (
                      <span className="text-3xl">{m.content}</span>
                    ) : m.type === "voice" ? (
                      <span className="flex items-center gap-2 text-primary"><Mic className="h-4 w-4" /> Vocale 0:0{Math.ceil(Math.random()*9)}</span>
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
            <Sparkles className="h-3 w-3 text-primary" /> Decodifica automatica attiva
          </p>
        </div>
      </div>
    </PageShell>
  );
}
