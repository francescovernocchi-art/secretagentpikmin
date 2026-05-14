import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Vibrate, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSession, type Role } from "@/lib/session";

const CHANNEL = "buzz-room";
const VIBRATION_PATTERN = [120, 60, 120, 60, 220];
const COOLDOWN_MS = 3000;

function targetOf(role: Role): Role {
  return role === "papa" ? "lorenzo" : "papa";
}

function nameOf(role: Role): string {
  return role === "papa" ? "Papà" : "Lorenzo";
}

export function BuzzButton() {
  const [role, setRole] = useState<Role | null>(null);
  const [sending, setSending] = useState(false);
  const [incoming, setIncoming] = useState(false);
  const lastSentRef = useRef(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const s = getSession();
    if (s) setRole(s.role);
  }, []);

  useEffect(() => {
    if (!role) return;
    const ch = supabase.channel(CHANNEL, {
      config: { broadcast: { self: false } },
    });
    ch.on("broadcast", { event: "buzz" }, (payload) => {
      const data = payload.payload as { from: Role; to: Role };
      if (data.to !== role) return;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(VIBRATION_PATTERN);
        } catch {
          // no-op
        }
      }
      setIncoming(true);
      toast(`📳 Segnale da ${nameOf(data.from)}!`, {
        description: "Ti sta cercando.",
      });
      setTimeout(() => setIncoming(false), 1400);
    });
    ch.subscribe();
    channelRef.current = ch;
    return () => {
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [role]);

  if (!role) return null;

  const send = async () => {
    if (sending) return;
    const now = Date.now();
    if (now - lastSentRef.current < COOLDOWN_MS) {
      toast.warning("Aspetta un attimo prima di rinviare");
      return;
    }
    const ch = channelRef.current;
    if (!ch) return;
    setSending(true);
    try {
      // feedback locale
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(60);
        } catch {
          // no-op
        }
      }
      const res = await ch.send({
        type: "broadcast",
        event: "buzz",
        payload: { from: role, to: targetOf(role) },
      });
      if (res === "ok") {
        lastSentRef.current = now;
        toast.success(`Segnale inviato a ${nameOf(targetOf(role))}`);
      } else {
        toast.error("Segnale non inviato. Riprova.");
      }
    } finally {
      setTimeout(() => setSending(false), 600);
    }
  };

  return (
    <>
      <div className="fixed right-3 bottom-24 z-40 safe-bottom">
        <motion.button
          onClick={send}
          whileTap={{ scale: 0.9 }}
          animate={sending ? { rotate: [0, -8, 8, -6, 6, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
          className="relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/40 flex items-center justify-center"
          aria-label={`Buzz a ${nameOf(targetOf(role))}`}
        >
          <Vibrate className="h-6 w-6" />
          <span className="pointer-events-none absolute -top-1 -right-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/40">
            {targetOf(role) === "papa" ? "P" : "L"}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {incoming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1.4, 1], opacity: [0, 1, 0.85] }}
              transition={{ duration: 1.2 }}
              className="rounded-full bg-primary/20 p-12 ring-4 ring-primary/60"
            >
              <Zap className="h-16 w-16 text-primary text-glow" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
