import { Shield, Radar, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { FACTIONS, type FactionKey } from "@/lib/village/factions";
import type { VillageStatus } from "@/lib/village/bonuses";
import type { BaseRow } from "@/lib/base";

interface Props {
  base: BaseRow;
  status: VillageStatus;
  faction: FactionKey;
}

/** Pannello laterale destro: identità Campo Base + statistiche. */
export function VillageStatsPanel({ base, status, faction }: Props) {
  const cfg = FACTIONS[faction];
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="panel-strong relative overflow-hidden p-3 space-y-2"
    >
      <span className="hud-corner tr" />
      <span className="hud-corner br" />
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${cfg.primary}, transparent 60%)` }}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-primary/80">// Campo Base</p>
          <p className="font-display text-sm text-glow leading-tight">{base.base_name ?? "Campo Base"}</p>
          <p className="text-[10px] text-muted-foreground">{cfg.emoji} {cfg.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] uppercase tracking-widest text-primary/60">Livello</p>
          <p className="font-display text-xl text-glow">{base.level}</p>
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-1.5 text-[10px]">
        <Stat icon={<Shield className="h-3 w-3" />} label="Difesa" value={String(status.defenseRating)} color="#fb7185" />
        <Stat icon={<Radar className="h-3 w-3" />} label="Raggio" value={`${base.action_radius ?? 300}m`} color="#7dd3fc" />
        <Stat icon={<Sparkles className="h-3 w-3" />} label="Strutture" value={`${status.buildingsTotal}`} color="#c084fc" />
      </div>
    </motion.div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-lg bg-night/60 border p-1.5 text-center"
      style={{ borderColor: `${color}40` }}
    >
      <div className="flex items-center justify-center gap-0.5" style={{ color }}>
        {icon}
        <span className="text-[8px] uppercase tracking-widest">{label}</span>
      </div>
      <p className="font-display text-sm text-glow mt-0.5">{value}</p>
    </div>
  );
}
