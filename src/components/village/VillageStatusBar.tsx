import { motion } from "framer-motion";
import { Battery, Shield, Sparkles, Radar as RadarIcon } from "lucide-react";
import { FACTIONS, FactionKey } from "@/lib/village/factions";
import type { VillageStatus } from "@/lib/village/bonuses";

interface Props {
  status: VillageStatus;
  faction: FactionKey | null;
}

const THREAT_COLOR: Record<VillageStatus["threatLevel"], string> = {
  calmo: "#7cd99a",
  vigilanza: "#fbbf24",
  allarme: "#ef4444",
};

const THREAT_LABEL: Record<VillageStatus["threatLevel"], string> = {
  calmo: "Tutto tranquillo",
  vigilanza: "Vigilanza attiva",
  allarme: "Allarme rosso",
};

export function VillageStatusBar({ status, faction }: Props) {
  const cfg = faction ? FACTIONS[faction] : null;
  const threatColor = THREAT_COLOR[status.threatLevel];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel-strong relative overflow-hidden p-3"
    >
      {cfg && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: `linear-gradient(90deg, ${cfg.primary}, transparent 70%)` }}
        />
      )}
      <div className="relative flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg?.emoji ?? "🏕️"}</span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-foreground/60">
              {cfg?.tagline ?? "Colonia"}
            </p>
            <p className="text-sm font-display text-foreground">{cfg?.name ?? "Senza fazione"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <motion.span
            className="h-2 w-2 rounded-full"
            style={{ background: threatColor, boxShadow: `0 0 8px ${threatColor}` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: threatColor }}>
            {THREAT_LABEL[status.threatLevel]}
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-4 gap-2">
        <Metric icon={<Battery className="h-3 w-3" />} label="Energia" value={`${status.energyMax}`} />
        <Metric icon={<Shield className="h-3 w-3" />} label="Difesa" value={`${status.defenseRating}`} />
        <Metric icon={<Sparkles className="h-3 w-3" />} label="Pikmin/h" value={`${status.pikminPerHour}`} />
        <Metric icon={<RadarIcon className="h-3 w-3" />} label="Radar" value={`${status.scanRange}m`} />
      </div>
    </motion.div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-night/60 border border-primary/15 p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-primary">
        {icon}
        <span className="text-[9px] uppercase tracking-widest text-foreground/60">{label}</span>
      </div>
      <p className="font-display text-sm text-glow mt-0.5">{value}</p>
    </div>
  );
}
