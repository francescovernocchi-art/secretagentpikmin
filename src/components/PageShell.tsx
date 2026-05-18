import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function PageShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const [clock, setClock] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen pb-28 pt-6"
    >
      <header className="px-5">
        <div className="flex items-end justify-between gap-3">
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-primary/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-hud-pulse" />
              <span>// 007-Pikmin</span>
              <span className="text-primary/40">·</span>
              <span className="font-mono tabular-nums text-primary/60">{clock}</span>
            </div>
            <h1 className="font-display text-2xl text-glow text-foreground mt-1">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
        {/* HUD line */}
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </header>
      <main className="mt-5 px-4 space-y-4">{children}</main>
    </motion.div>
  );
}
