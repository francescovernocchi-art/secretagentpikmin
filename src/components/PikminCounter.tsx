import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getPikminCount } from "@/lib/pikmin";

/**
 * Mostra il contatore Pikmin condivisi della squadra. Si aggiorna in realtime.
 */
export function PikminCounter({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let mounted = true;
    getPikminCount().then((c) => {
      if (mounted) setCount(c);
    });
    const ch = supabase
      .channel("pikmin-counter-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pikmin_squad" },
        (payload: any) => {
          const next = (payload.new?.count as number) ?? 0;
          if (mounted) {
            setCount(next);
            setPulse((p) => p + 1);
          }
        },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <motion.div
      key={pulse}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.12, 1] }}
      transition={{ duration: 0.4 }}
      className={`inline-flex items-center gap-1.5 panel ${compact ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs"} text-primary`}
      title="Pikmin della squadra"
    >
      <span className="text-base leading-none">🌱</span>
      <span className="font-display tabular-nums text-glow">
        {count ?? "…"}
      </span>
      {!compact && (
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Pikmin
        </span>
      )}
    </motion.div>
  );
}
