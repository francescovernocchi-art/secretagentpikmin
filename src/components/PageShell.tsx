import { motion } from "framer-motion";
import type { ReactNode } from "react";

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen pb-28 pt-6"
    >
      <header className="px-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-primary/80">// 007-Pikmin</p>
            <h1 className="font-display text-2xl text-glow text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
      </header>
      <main className="mt-5 px-4 space-y-4">{children}</main>
    </motion.div>
  );
}
