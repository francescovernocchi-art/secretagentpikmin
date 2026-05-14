import { Link, useRouterState } from "@tanstack/react-router";
import { Radio, MessageSquare, Target, Trophy, User, FlaskConical, Map, Rocket, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { to: "/base", icon: Radio, label: "Base" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/missioni", icon: Target, label: "Mission" },
  { to: "/mappa", icon: Map, label: "Mappa" },
  { to: "/navicella", icon: Rocket, label: "Nave" },
  { to: "/lab", icon: FlaskConical, label: "Lab" },
  { to: "/mercato", icon: ShoppingBag, label: "Market" },
  { to: "/premi", icon: Trophy, label: "Premi" },
  { to: "/profilo", icon: User, label: "Agente" },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
      <div className="mx-2 mb-2 panel-strong px-1 py-1">
        <ul className="grid grid-cols-9 gap-0.5">
          {items.map(({ to, icon: Icon, label }) => {
            const active = path.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className="relative flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors"
                >
                  {active && (
                    <motion.span
                      layoutId="navpill"
                      className="absolute inset-0 rounded-xl bg-primary/15 ring-1 ring-primary/40"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-5 w-5 ${active ? "text-primary text-glow" : ""}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className={`relative z-10 mt-0.5 ${active ? "text-primary" : ""}`}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
