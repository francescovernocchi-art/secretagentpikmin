import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Bell,
  Map,
  MessageSquare,
  Radio,
  Rocket,
  ScanLine,
  Target,
  Users,
} from "lucide-react";
import { Radar } from "@/components/Radar";
import { PikminCounter } from "@/components/PikminCounter";
import { MissionProgressPanel } from "@/components/game/MissionProgressPanel";
import { SpaceshipAssemblyPanel } from "@/components/game/SpaceshipAssemblyPanel";
import { ResourceTransformPanel } from "@/components/game/ResourceTransformPanel";
import { GameNotificationsPanel } from "@/components/game/GameNotificationsPanel";
import { VillageNetworkPanel } from "@/components/game/VillageNetworkPanel";
import { RemoteControlPanel } from "@/components/game/RemoteControlPanel";
import { VillageDiorama } from "@/components/game/VillageDiorama";
import { VillageGameHUD } from "@/components/game/diorama/VillageGameHUD";
import { AudioToggle } from "@/components/game/AudioToggle";
import { ShipPreviewSvg } from "@/components/game/assets/GameIcons";
import { ParticleEffect } from "@/components/fx/ParticleEffect";
import { hapticScan, hapticTap } from "@/lib/haptic";
import { getSession, clearSession } from "@/lib/session";
import { GAME_IDENTITY, getBiomeByKey } from "@/data/secretPikminWorld";
import { useHomeDashboard, useGameNotifications, usePlayerBiome } from "@/hooks/useGameData";
import { expeditionEtaMinutes, formatRelativeTime } from "@/lib/game/home";

export function CommandCenterHome() {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const [scanning, setScanning] = useState(false);
  const { data, loading } = useHomeDashboard();
  const { unread } = useGameNotifications();
  const { biome } = usePlayerBiome();
  const biomeDef = getBiomeByKey(biome);

  const planet = data?.planet;
  const debtRemaining = planet ? planet.debt_total - planet.debt_paid : 0;
  const debtBar = planet ? Math.round((planet.debt_paid / planet.debt_total) * 100) : 0;

  const handleScan = () => {
    hapticScan();
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      navigate({ to: "/radar" });
    }, 900);
  };

  return (
    <div className="space-y-4">
      {/* Command bridge header */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bridge-panel relative overflow-hidden"
      >
        <ParticleEffect variant="energy" density="low" />
        <span className="hud-corner tl" />
        <span className="hud-corner tr" />
        <span className="hud-corner bl" />
        <span className="hud-corner br" />

        <div className="relative p-4 pb-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80 font-display">// Plancia di Comando</p>
              <h1 className="font-display text-2xl text-glow mt-1">{GAME_IDENTITY.title}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {session?.name ?? "Comandante"} · {biomeDef?.emoji} {biomeDef?.label}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <AudioToggle compact />
                {unread > 0 && (
                  <span className="panel px-2 py-1 text-[10px] text-primary flex items-center gap-1 ring-1 ring-rose-500/40">
                    <Bell className="h-3 w-3" /> {unread}
                  </span>
                )}
                <PikminCounter compact />
              </div>
              <button
                onClick={() => {
                  hapticTap();
                  clearSession();
                  navigate({ to: "/" });
                }}
                className="text-[10px] text-muted-foreground uppercase tracking-widest"
              >
                Esci
              </button>
            </div>
          </div>
          <VillageGameHUD biomeLabel={biomeDef?.label} biomeEmoji={biomeDef?.emoji} />
        </div>
      </motion.section>

      {/* Live village diorama preview */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
        <VillageDiorama compact showFooter={false} />
        <div className="flex justify-center -mt-2">
          <Link to="/villaggio" onClick={hapticTap} className="btn-neon px-4 py-1.5 text-[10px] uppercase tracking-widest">
            Entra nel Villaggio →
          </Link>
        </div>
      </motion.div>

      {/* Planet + ship command row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.section
          initial={{ x: -8, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bridge-panel p-4 relative overflow-hidden"
        >
          <ParticleEffect variant="dust" density="low" />
          <span className="hud-corner tl" />
          <p className="text-[10px] uppercase tracking-widest text-[var(--ad-nature)] mb-1">Pianeta in pericolo</p>
          <p className="text-xs text-muted-foreground mb-2">Ogni credito conta per salvare il mondo nativo.</p>
          <p className="font-display text-2xl text-glow">{loading ? "…" : `${debtRemaining} cr`}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">ancora da estinguere</p>
          <div className="mt-2 progress-mission">
            <div className="progress-mission-fill progress-planet-fill" style={{ width: `${debtBar}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <MiniGauge label="Cibo" value={planet?.food ?? 0} color="#86efac" />
            <MiniGauge label="Energia" value={planet?.energy ?? 0} color="#38bdf8" />
            <MiniGauge label="Morale" value={planet?.morale ?? 0} color="#f472b6" />
          </div>
        </motion.section>

        <motion.section
          initial={{ x: 8, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bridge-panel p-4 relative overflow-hidden"
        >
          <ParticleEffect variant="ship-glow" />
          <span className="hud-corner tr" />
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--ad-ship-glow)] flex items-center gap-1">
                <Rocket className="h-3 w-3" /> Hangar · Navicella
              </p>
              <p className="font-display text-xl text-glow">{loading ? "…" : `${data?.shipPercent ?? 0}%`}</p>
              <p className="text-[9px] text-muted-foreground">ricostruzione in corso</p>
            </div>
            <ShipPreviewSvg percent={data?.shipPercent ?? 0} size={88} />
          </div>
          <div className="relative flex justify-center mb-2">
            <Radar size={72} />
            {scanning && (
              <motion.div
                initial={{ scale: 0.3, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.9 }}
                className="absolute inset-0 rounded-full border-2 border-primary"
              />
            )}
          </div>
          <div className="flex gap-1 mb-3 flex-wrap">
            {(data?.shipParts ?? []).map((p) => (
              <span key={p.key} title={p.name} className={`text-lg ${p.collected ? "opacity-100 drop-shadow-[0_0_6px_var(--color-primary)]" : "opacity-25 grayscale"}`}>
                {p.emoji}
              </span>
            ))}
          </div>
          <button onClick={handleScan} disabled={scanning} className="btn-neon w-full py-2 text-xs flex items-center justify-center gap-2">
            <ScanLine className={`h-4 w-4 ${scanning ? "animate-pulse" : ""}`} />
            {scanning ? "Scansione…" : "Radar / Scansiona"}
          </button>
        </motion.section>
      </div>

      <SpaceshipAssemblyPanel compact />
      <ResourceTransformPanel compact />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <GamePanel title="Spedizioni attive" icon={<Target className="h-3 w-3" />} count={(data?.expeditions.length ?? 0) + (data?.activeMissionCount ?? 0)}>
          <ul className="space-y-2">
            {(data?.expeditions ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between text-xs">
                <span className="truncate flex-1">{e.title}</span>
                <span className="text-primary ml-2">{expeditionEtaMinutes(e)}m</span>
              </li>
            ))}
            {(!data?.expeditions.length && !loading) && <li className="text-xs text-muted-foreground">Nessuna spedizione attiva</li>}
          </ul>
          <Link to="/spedizioni" onClick={hapticTap} className="text-[10px] text-primary uppercase tracking-widest mt-2 inline-block">Tutte →</Link>
        </GamePanel>

        <GamePanel title="Ultimi ritrovamenti" icon={<Radio className="h-3 w-3" />}>
          <ul className="space-y-2">
            {(data?.discoveries ?? []).map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-xs">
                <span>{d.emoji ?? "✨"}</span>
                <span className="flex-1 truncate">{d.label}</span>
                <span className="text-muted-foreground">{formatRelativeTime(d.created_at)}</span>
              </li>
            ))}
            {(!data?.discoveries.length && !loading) && <li className="text-xs text-muted-foreground">Scansiona un'area</li>}
          </ul>
        </GamePanel>
      </div>

      <GamePanel title="Comandanti famiglia" icon={<Users className="h-3 w-3" />}>
        <ul className="space-y-2">
          {(data?.family ?? []).map((a) => {
            const mins = Math.max(0, Math.floor((Date.now() - new Date(a.last_seen_at).getTime()) / 60000));
            const live = a.online || mins < 5;
            return (
              <li
                key={a.agent_key}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${live ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
              >
                <span className="text-lg">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{a.display_name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{live ? "online" : `${mins}m fa`}</p>
                </div>
                <span className={`h-2 w-2 rounded-full ${live ? "bg-primary animate-pulse" : "bg-muted-foreground/40"}`} />
              </li>
            );
          })}
        </ul>
      </GamePanel>

      <section className="grid grid-cols-3 gap-2">
        <QuickLink to="/villaggio" icon={<span className="text-xl">🏘️</span>} label="Villaggio" />
        <QuickLink to="/mappa" icon={<Map className="h-5 w-5 text-primary" />} label="Mappa" />
        <QuickLink to="/missioni" icon={<Target className="h-5 w-5 text-primary" />} label="Missioni" />
        <QuickLink to="/radar" icon={<Radio className="h-5 w-5 text-primary" />} label="Radar" />
        <QuickLink to="/chat" icon={<MessageSquare className="h-5 w-5 text-primary" />} label="Chat" />
        <QuickLink to="/archivio" icon={<span className="text-xl">🌱</span>} label="Pikmin" />
      </section>

      <GameNotificationsPanel compact />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <VillageNetworkPanel compact />
        <RemoteControlPanel compact />
      </div>
      <MissionProgressPanel compact />
    </div>
  );
}

function MiniGauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="panel p-2">
      <p className="text-[8px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-sm" style={{ color }}>{value}%</p>
      <div className="h-1 mt-1 rounded-full bg-night/50 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function GamePanel({ title, icon, count, children }: { title: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) {
  return (
    <section className="panel-strong p-4 space-y-2 relative overflow-hidden">
      <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
        {icon} {title}
        {count !== undefined && count > 0 && <span className="ml-auto panel px-1.5 py-0.5 text-[9px] text-primary">{count}</span>}
      </p>
      {children}
    </section>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} onClick={hapticTap} className="panel-strong p-3 flex flex-col items-center gap-1.5 active:scale-95 transition hover:ring-1 hover:ring-primary/35">
      {icon}
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </Link>
  );
}
