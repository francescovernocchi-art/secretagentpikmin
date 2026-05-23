import { Battery, Sparkles, Coins, Zap, Users } from "lucide-react";
import type { Session } from "@/lib/session";
import type { BaseRow } from "@/lib/base";
import type { VillageStatus } from "@/lib/village/bonuses";

interface Props {
  session: Session | null;
  base: BaseRow;
  status: VillageStatus;
  coins: number;
  pikminCount: number;
}

/** HUD top: agente, livello, risorse principali. Tutto in italiano. */
export function VillageHud({ session, base, status, coins, pikminCount }: Props) {
  const agentName = session?.name ?? (session?.role === "papa" ? "Comandante" : "Agente");
  const emoji = session?.emoji ?? "🕵️";
  return (
    <div className="panel-strong relative overflow-hidden p-2.5">
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-2xl border-2"
            style={{ borderColor: "var(--color-primary)" }}
          >
            {emoji}
          </div>
          <span className="absolute -bottom-1 -right-1 text-[9px] bg-primary text-primary-foreground px-1 rounded-full font-bold">
            Lv {base.level}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-primary/80">// Agente</p>
          <p className="font-display text-sm text-glow truncate">{agentName}</p>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <Pill icon={<Coins className="h-3 w-3" />} value={coins} color="#fbbf24" label="monete" />
          <Pill icon={<Users className="h-3 w-3" />} value={pikminCount} color="#7be07b" label="pikmin" />
          <Pill
            icon={<Battery className="h-3 w-3" />}
            value={`${base.energy_current}/${status.energyMax}`}
            color="#7dd3fc"
            label="energia"
          />
          <Pill
            icon={<Sparkles className="h-3 w-3" />}
            value={`+${status.pikminPerHour}/h`}
            color="#c084fc"
            label="crescita"
          />
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, value, color, label }: { icon: React.ReactNode; value: string | number; color: string; label: string }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-night/60 border"
      style={{ borderColor: `${color}55` }}
      aria-label={label}
    >
      <span style={{ color }}>{icon}</span>
      <span className="font-display text-foreground/90 tabular-nums">{value}</span>
    </div>
  );
}
