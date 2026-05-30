import { useState } from "react";
import { Send } from "lucide-react";
import { CHAT_CHANNELS, CHAT_QUICK_MESSAGES } from "@/data/secretPikminWorld";
import type { ChatChannelKey } from "@/types/secretPikmin";
import { useFamilyChat } from "@/hooks/useGameData";
import { senderDisplayName } from "@/lib/game/chat";
import { formatRelativeTime } from "@/lib/game/home";

interface FamilyChatPanelProps {
  onSend?: (text: string, channel: ChatChannelKey) => void;
  embedded?: boolean;
  showMessages?: boolean;
  channel?: ChatChannelKey;
  onChannelChange?: (channel: ChatChannelKey) => void;
}

export function FamilyChatPanel({
  onSend,
  embedded = false,
  showMessages = true,
  channel: channelProp,
  onChannelChange,
}: FamilyChatPanelProps) {
  const [channelState, setChannelState] = useState<ChatChannelKey>("famiglia");
  const channel = channelProp ?? channelState;
  const setChannel = (ch: ChatChannelKey) => {
    onChannelChange?.(ch);
    if (channelProp === undefined) setChannelState(ch);
  };
  const { messages, loading, send } = useFamilyChat(channel);

  const filtered = messages.filter((m) => m.channel === channel || (!embedded && channel === "famiglia"));
  const quickForChannel = CHAT_QUICK_MESSAGES.filter((q) => q.channel === channel || q.channel === "famiglia");

  const handleQuick = async (text: string) => {
    if (onSend) {
      onSend(text, channel);
      return;
    }
    await send(text, channel, "quick");
  };

  return (
    <div className={embedded ? "space-y-3" : "space-y-4"}>
      {!embedded && (
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Chat Segreta</p>
          <h2 className="font-display text-xl text-glow">Canali famiglia</h2>
        </header>
      )}

      <div className="flex flex-wrap gap-2">
        {CHAT_CHANNELS.map((c) => (
          <button
            key={c.key}
            onClick={() => setChannel(c.key)}
            className={`rounded-full px-3 py-1.5 text-[10px] uppercase tracking-wider border transition ${
              channel === c.key ? "bg-primary/20 border-primary/50 text-primary" : "bg-night/50 border-border text-muted-foreground"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {showMessages && (
        <section className="panel p-3 max-h-40 overflow-y-auto space-y-2">
          {loading && <p className="text-xs text-muted-foreground">Carico messaggi…</p>}
          {filtered.map((m) => (
            <div key={m.id} className="text-xs">
              <span className="text-primary/80">{senderDisplayName(m.sender_agent)}</span>
              <span className="text-muted-foreground/60 ml-1">{formatRelativeTime(m.created_at)}</span>
              <p className="text-foreground/90">{m.content}</p>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground">Nessun messaggio in questo canale</p>
          )}
        </section>
      )}

      <section className="panel p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-primary/80">Messaggi rapidi</p>
        <div className="flex flex-wrap gap-2">
          {quickForChannel.map((q) => (
            <button
              key={q.id}
              onClick={() => handleQuick(q.text)}
              className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-xs flex items-center gap-2 active:scale-95 transition"
            >
              <span>{q.emoji}</span>
              <span>{q.text}</span>
              <Send className="h-3 w-3 text-primary ml-1" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
