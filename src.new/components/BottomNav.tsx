import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Home,
  Map as MapIcon,
  Target,
  Skull,
  ShoppingBag,
  MessageSquare,
  User,
  Sprout,
  ChevronUp,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { hapticTap } from "@/lib/haptic";
import { getSession } from "@/lib/session";
import { HIDDEN_ROUTES, MAIN_NAV } from "@/data/secretPikminWorld";
import { useGameNotifications, useHomeDashboard } from "@/hooks/useGameData";

type NavItem = { to: string; icon: LucideIcon | "emoji"; label: string; emoji?: string; admin?: boolean; badgeKey?: "notif" | "mission" | "trade" };

const PRIMARY_NAV: NavItem[] = [
  { to: "/base", icon: Home, label: "Home", badgeKey: "notif" },
  { to: "/villaggio", icon: "emoji", label: "Villaggio", emoji: "🏘️" },
  { to: "/mappa", icon: MapIcon, label: "Mappa" },
  { to: "/archivio", icon: Sprout, label: "Pikmin" },
  { to: "/missioni", icon: Target, label: "Missioni", badgeKey: "mission" },
  { to: "/nemici", icon: Skull, label: "Bestiario" },
  { to: "/mercato", icon: ShoppingBag, label: "Market", badgeKey: "trade" },
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/profilo", icon: User, label: "Profilo" },
];

const ADMIN_LINKS = HIDDEN_ROUTES.filter((r) => "admin" in r && r.admin);

function NavIcon({ item }: { item: NavItem }) {
  if (item.icon === "emoji") return <span className="text-xl leading-none drop-shadow-[0_0_6px_rgba(132,255,159,0.35)]">{item.emoji}</span>;
  const Icon = item.icon;
  return <Icon className="h-6 w-6" strokeWidth={2.2} />;
}

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? getSession() : null;
  const isAdmin = session?.role === "papa";
  const [showMore, setShowMore] = useState(false);
  const { unread } = useGameNotifications();
  const { data } = useHomeDashboard();

  const missionCount = (data?.expeditions.length ?? 0) + (data?.activeMissionCount ?? 0);
  const familyOnline = (data?.family ?? []).filter((a) => a.online || Date.now() - new Date(a.last_seen_at).getTime() < 300000).length;

  const badgeFor = (key?: NavItem["badgeKey"]) => {
    if (key === "notif" && unread > 0) return unread;
    if (key === "mission" && missionCount > 0) return missionCount;
    return 0;
  };

  const isActive = (to: string) =>
    path === to || (to !== "/" && path.startsWith(to + "/"));

  const activePrimary = PRIMARY_NAV.find((l) => isActive(l.to))?.to;
  const hiddenActive = HIDDEN_ROUTES.some((r) => isActive(r.to));

  return (
    <>
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="fixed inset-x-2 bottom-[5.75rem] z-50 panel-strong p-4 safe-bottom max-h-[55vh] overflow-y-auto border border-primary/25"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-primary font-display">Collegamenti rapidi</p>
                {familyOnline > 0 && (
                  <span className="text-[9px] text-emerald-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {familyOnline} online
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {HIDDEN_ROUTES.filter((r) => !("admin" in r) || !r.admin || isAdmin).map((r) => (
                  <Link
                    key={r.to}
                    to={r.to}
                    onClick={() => {
                      hapticTap();
                      setShowMore(false);
                    }}
                    className={`panel p-3 text-center text-[10px] uppercase tracking-wide min-h-[56px] flex items-center justify-center ${isActive(r.to) ? "ring-1 ring-primary/60 bg-primary/10" : ""}`}
                  >
                    {r.label}
                  </Link>
                ))}
                {isAdmin &&
                  ADMIN_LINKS.map((r) => (
                    <Link
                      key={r.to}
                      to={r.to}
                      onClick={() => {
                        hapticTap();
                        setShowMore(false);
                      }}
                      className="panel p-3 text-center text-[10px] flex flex-col items-center justify-center gap-1 min-h-[56px]"
                    >
                      <Wrench className="h-5 w-5 text-primary" />
                      {r.label}
                    </Link>
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom">
        <div className="relative mx-1 mb-2 panel-strong px-1 py-2 overflow-hidden border border-primary/20 bg-[linear-gradient(180deg,rgba(8,14,20,0.97)_0%,rgba(4,8,12,0.99)_100%)]">
          <span className="hud-corner tl" />
          <span className="hud-corner tr" />
          <span className="hud-corner bl" />
          <span className="hud-corner br" />
          <ul className="relative flex gap-0.5 overflow-x-auto no-scrollbar">
            {PRIMARY_NAV.map((l) => {
              const active = activePrimary === l.to;
              const badge = badgeFor(l.badgeKey);
              return (
                <li key={l.to} className="shrink-0 flex-1 min-w-[54px]">
                  <Link
                    to={l.to}
                    onClick={hapticTap}
                    className="relative flex flex-col items-center justify-center w-full rounded-xl px-0.5 py-2 text-[9px] font-semibold"
                  >
                    {active && (
                      <motion.span
                        layoutId="navpill-main"
                        className="absolute inset-0 rounded-xl bg-primary/18 ring-1 ring-primary/55 shadow-[0_0_12px_rgba(132,255,159,0.15)]"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className={`relative z-10 ${active ? "text-primary scale-110" : "text-muted-foreground"}`}>
                      <NavIcon item={l} />
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-[8px] font-bold text-white grid place-items-center leading-none">
                          {badge > 9 ? "9+" : badge}
                        </span>
                      )}
                    </span>
                    <span className={`relative z-10 mt-1 tracking-wide uppercase leading-tight text-center ${active ? "text-primary text-glow" : "text-muted-foreground"}`}>
                      {l.label.split(" ")[0]}
                    </span>
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0 min-w-[48px]">
              <button
                onClick={() => {
                  hapticTap();
                  setShowMore((v) => !v);
                }}
                className={`relative flex flex-col items-center justify-center w-full rounded-xl px-1 py-2 text-[9px] ${
                  hiddenActive || showMore ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {(hiddenActive || showMore) && (
                  <span className="absolute inset-0 rounded-xl bg-primary/12 ring-1 ring-primary/45" />
                )}
                <ChevronUp className={`relative z-10 h-6 w-6 ${showMore ? "rotate-180" : ""} transition`} />
                <span className="relative z-10 mt-1 uppercase font-semibold">Altro</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}

export { MAIN_NAV, PRIMARY_NAV };
