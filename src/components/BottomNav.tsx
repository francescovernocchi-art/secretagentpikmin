import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Gamepad2,
  Home,
  Package,
  Palette,
  User,
  Map as MapIcon,
  Target,
  Send,
  Skull,
  Radio,
  MessageSquare,
  Building2,
  Handshake,
  FlaskConical,
  BookOpen,
  Rocket,
  ShoppingBag,
  Trophy,
  Wrench,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { hapticTap } from "@/lib/haptic";
import { getSession } from "@/lib/session";

type NavLink = { to: string; icon: LucideIcon; label: string; admin?: boolean };
type NavGroup = { key: string; icon: LucideIcon; label: string; links: NavLink[]; primary?: string };

const GROUPS: NavGroup[] = [
  {
    key: "gioco",
    icon: Gamepad2,
    label: "Gioco",
    primary: "/mappa",
    links: [
      { to: "/mappa", icon: MapIcon, label: "Mappa" },
      { to: "/missioni", icon: Target, label: "Missioni" },
      { to: "/spedizioni", icon: Send, label: "Spedizioni" },
      { to: "/nemici", icon: Skull, label: "Bestiario" },
      { to: "/radar", icon: Radio, label: "Radar Pikmin" },
      { to: "/chat", icon: MessageSquare, label: "Chat" },
    ],
  },
  {
    key: "villaggio",
    icon: Home,
    label: "Villaggio",
    primary: "/villaggio",
    links: [
      { to: "/villaggio", icon: Home, label: "Il mio villaggio" },
      { to: "/villaggio/edifici", icon: Building2, label: "Edifici" },
      { to: "/villaggio/scambi", icon: Handshake, label: "Scambi" },
      { to: "/base", icon: Radio, label: "Campo Base" },
    ],
  },
  {
    key: "inventario",
    icon: Package,
    label: "Risorse",
    primary: "/inventario",
    links: [
      { to: "/inventario", icon: Package, label: "Inventario" },
      { to: "/lab", icon: FlaskConical, label: "Laboratorio" },
      { to: "/ricette", icon: BookOpen, label: "Ricette" },
      { to: "/navicella", icon: Rocket, label: "Navicella" },
      { to: "/mercato", icon: ShoppingBag, label: "Mercato" },
      { to: "/premi", icon: Trophy, label: "Premi" },
      { to: "/archivio", icon: BookOpen, label: "Archivio" },
    ],
  },
  {
    key: "personalizza",
    icon: Palette,
    label: "Stile",
    primary: "/atelier",
    links: [
      { to: "/atelier", icon: Palette, label: "Atelier icone", admin: true },
      { to: "/villaggio", icon: Home, label: "Estetica villaggio" },
      { to: "/profilo", icon: User, label: "Skin agente" },
    ],
  },
  {
    key: "profilo",
    icon: User,
    label: "Profilo",
    primary: "/profilo",
    links: [
      { to: "/profilo", icon: User, label: "Profilo agente" },
      { to: "/agenti", icon: Users, label: "Famiglia" },
      { to: "/profilo", icon: Wrench, label: "Comandante", admin: true },
    ],
  },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? getSession() : null;
  const isAdmin = session?.role === "papa";
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const activeGroup = GROUPS.find((g) =>
    g.links.some((l) => path === l.to || (l.to !== "/" && path.startsWith(l.to + "/")) || path === l.to),
  )?.key;

  return (
    <>
      <AnimatePresence>
        {openGroup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpenGroup(null)}
            />
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="fixed inset-x-2 bottom-[5.5rem] z-50 panel-strong p-3 safe-bottom"
            >
              {(() => {
                const g = GROUPS.find((x) => x.key === openGroup)!;
                const links = g.links.filter((l) => !l.admin || isAdmin);
                return (
                  <>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <g.icon className="h-4 w-4 text-primary" />
                      <p className="text-[11px] uppercase tracking-widest text-primary">
                        {g.label}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {links.map((l) => {
                        const active = path === l.to;
                        return (
                          <Link
                            key={l.to + l.label}
                            to={l.to}
                            onClick={() => {
                              hapticTap();
                              setOpenGroup(null);
                            }}
                            className={`panel p-3 flex flex-col items-center gap-1 active:scale-95 transition ${
                              active ? "ring-1 ring-primary/60 bg-primary/10" : ""
                            }`}
                          >
                            <l.icon className="h-5 w-5 text-primary" />
                            <span className="text-[10px] text-center leading-tight">
                              {l.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
        <div className="relative mx-2 mb-2 panel-strong px-2 py-2 overflow-hidden">
          <span className="hud-corner tl" />
          <span className="hud-corner tr" />
          <span className="hud-corner bl" />
          <span className="hud-corner br" />
          <ul className="relative flex justify-around gap-1">
            {GROUPS.map((g) => {
              const active = activeGroup === g.key && !openGroup;
              const Icon = g.icon;
              return (
                <li key={g.key} className="flex-1">
                  <button
                    onClick={() => {
                      hapticTap();
                      setOpenGroup(openGroup === g.key ? null : g.key);
                    }}
                    className="relative flex flex-col items-center justify-center w-full rounded-xl px-1 py-2 text-[10px] font-medium text-muted-foreground"
                  >
                    {(active || openGroup === g.key) && (
                      <motion.span
                        layoutId="navpill"
                        className="absolute inset-0 rounded-xl bg-primary/15 ring-1 ring-primary/50"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <Icon
                      className={`relative z-10 h-5 w-5 transition-transform ${
                        active || openGroup === g.key
                          ? "text-primary text-glow scale-110"
                          : ""
                      }`}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    <span
                      className={`relative z-10 mt-0.5 tracking-wider uppercase ${
                        active || openGroup === g.key ? "text-primary" : ""
                      }`}
                    >
                      {g.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}
