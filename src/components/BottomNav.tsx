import { Link, useRouterState } from "@tanstack/react-router";
import { Radio, MessageSquare, Target, Trophy, User, FlaskConical, Map, Rocket, ShoppingBag, BookOpen, Skull, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { hapticTap } from "@/lib/haptic";
import { getSession } from "@/lib/session";

const baseItems = [
  { to: "/base", icon: Radio, label: "Base" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/missioni", icon: Target, label: "Mission" },
  { to: "/mappa", icon: Map, label: "Mappa" },
  { to: "/navicella", icon: Rocket, label: "Nave" },
  { to: "/lab", icon: FlaskConical, label: "Lab" },
  { to: "/mercato", icon: ShoppingBag, label: "Market" },
  { to: "/archivio", icon: BookOpen, label: "Archivio" },
  { to: "/nemici", icon: Skull, label: "Nemici" },
  { to: "/premi", icon: Trophy, label: "Premi" },
  { to: "/profilo", icon: User, label: "Agente" },
] as const;

const adminItem = { to: "/atelier", icon: Wrench, label: "Atelier" } as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
      <div className="relative mx-2 mb-2 panel-strong px-1 py-1 overflow-hidden">
        {/* HUD corners */}
        <span className="hud-corner tl" />
        <span className="hud-corner tr" />
        <span className="hud-corner bl" />
        <span className="hud-corner br" />
        {/* scan line interno */}
        <div
          className="pointer-events-none absolute inset-x-0 h-6 opacity-40"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(0.86 0.24 145 / 0.18), transparent)",
            animation: "tactical-scan 6s linear infinite",
          }}
        />
        <ul className="relative flex gap-0.5 overflow-x-auto no-scrollbar min-w-full">
          {items.map(({ to, icon: Icon, label }) => {
            const active = path.startsWith(to);
            return (
              <li key={to} className="shrink-0 w-[10.5%] min-w-[44px]">
                <Link
                  to={to}
                  onClick={hapticTap}
                  className="relative flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="navpill"
                      className="absolute inset-0 rounded-xl bg-primary/15 ring-1 ring-primary/50 animate-nav-glow"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-5 w-5 transition-transform ${active ? "text-primary text-glow scale-110" : "group-hover:scale-105"}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className={`relative z-10 mt-0.5 tracking-wider uppercase ${active ? "text-primary" : ""}`}>
                    {label}
                  </span>
                  {active && (
                    <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
