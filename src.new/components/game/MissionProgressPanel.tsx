import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CORE_MISSIONS } from "@/data/secretPikminWorld";
import { hapticTap } from "@/lib/haptic";
import { useMissionProgress } from "@/hooks/useGameData";
import { CoreMissionIconSvg, type CoreMissionKey } from "@/components/game/assets/GameIcons";

interface MissionProgressPanelProps {
  compact?: boolean;
}

function missionStatus(pct: number): { label: string; tone: string } {
  if (pct >= 100) return { label: "Completata", tone: "text-emerald-400" };
  if (pct >= 60) return { label: "Avanzata", tone: "text-primary" };
  if (pct >= 20) return { label: "In corso", tone: "text-amber-300" };
  return { label: "Iniziata", tone: "text-muted-foreground" };
}

function progressFillClass(key: CoreMissionKey): string {
  if (key === "ship") return "progress-mission-fill progress-ship-fill";
  if (key === "debt") return "progress-mission-fill";
  if (key === "planet") return "progress-mission-fill progress-planet-fill";
  return "progress-mission-fill";
}

export function MissionProgressPanel({ compact = false }: MissionProgressPanelProps) {
  const { progress, loading } = useMissionProgress();

  return (
    <section className="space-y-3">
      {!compact && (
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Missioni principali</p>
          <h2 className="font-display text-xl text-glow">Salvare il pianeta originario</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Quattro grandi missioni famiglia: navicella, debito, cibo/energia, bestiario.
          </p>
        </header>
      )}

      <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {CORE_MISSIONS.map((m, i) => {
          const link =
            m.key === "ship"
              ? "/navicella"
              : m.key === "debt"
                ? "/mercato"
                : m.key === "planet"
                  ? "/inventario"
                  : "/nemici";

          let pct = 0;
          let detail = loading ? "…" : "";
          if (progress) {
            if (m.key === "ship") {
              pct = progress.shipTotal ? Math.round((progress.shipCollected / progress.shipTotal) * 100) : 0;
              detail = `${progress.shipCollected}/${progress.shipTotal} pezzi`;
            } else if (m.key === "debt") {
              pct = progress.debtTotal ? Math.round((progress.debtPaid / progress.debtTotal) * 100) : 0;
              detail = `${progress.debtPaid} / ${progress.debtTotal} cr · restano ${progress.debtTotal - progress.debtPaid}`;
            } else if (m.key === "planet") {
              pct = Math.round((progress.food + progress.energy) / 2);
              detail = `${pct}% riserve`;
            } else {
              pct = progress.bestiaryTotal ? Math.round((progress.bestiaryCount / progress.bestiaryTotal) * 100) : 0;
              detail = `${progress.bestiaryCount}/${progress.bestiaryTotal} schede`;
            }
          }

          const status = missionStatus(pct);
          const done = pct >= 100;

          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={link}
                onClick={hapticTap}
                className={`mission-card block relative overflow-hidden p-4 bg-gradient-to-br ${m.color} active:scale-[0.98] transition ${done ? "mission-card-complete" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-2xl border border-primary/30 bg-night/60 grid place-items-center shrink-0">
                    <CoreMissionIconSvg missionKey={m.key as CoreMissionKey} size={36} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-widest text-primary/80">{m.progressLabel}</p>
                      <span className={`text-[9px] uppercase tracking-wider ${status.tone}`}>{status.label}</span>
                    </div>
                    <h3 className="font-display text-base text-glow leading-tight mt-1">{m.title}</h3>
                    {!compact && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.short}</p>}
                    <div className="mt-2 progress-mission">
                      <div
                        className={progressFillClass(m.key as CoreMissionKey)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-primary mt-1">{detail}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
