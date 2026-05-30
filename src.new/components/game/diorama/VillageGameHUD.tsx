import { Link } from "@tanstack/react-router";
import { Bell, Users } from "lucide-react";
import { hapticTap } from "@/lib/haptic";
import { useHomeDashboard, useGameNotifications, usePikminSquad } from "@/hooks/useGameData";
import styles from "@/styles/village-diorama.module.css";

interface VillageGameHUDProps {
  biomeLabel?: string;
  biomeEmoji?: string;
  /** Nasconde bioma/alert extra (es. quando già in header villaggio) */
  compactExtras?: boolean;
}

export function VillageGameHUD({ biomeLabel, biomeEmoji, compactExtras }: VillageGameHUDProps) {
  const { data, loading } = useHomeDashboard();
  const { unread } = useGameNotifications();
  const { squad } = usePikminSquad();

  const planet = data?.planet;
  const debtRemaining = planet ? planet.debt_total - planet.debt_paid : 0;
  const onMission = squad.filter((p) => p.status === "in_spedizione" || p.status === "in_missione");
  const available = squad.filter((p) => p.status === "disponibile");

  const stats = [
    { icon: "💳", label: "Debito", value: loading ? "…" : `${debtRemaining}`, bar: planet ? Math.round((planet.debt_paid / planet.debt_total) * 100) : 0, color: "#fbbf24" },
    { icon: "🍖", label: "Cibo", value: loading ? "…" : `${planet?.food ?? 0}%`, bar: planet?.food ?? 0, color: "#86efac" },
    { icon: "⚡", label: "Energia", value: loading ? "…" : `${planet?.energy ?? 0}%`, bar: planet?.energy ?? 0, color: "#38bdf8" },
    { icon: "💚", label: "Morale", value: loading ? "…" : `${planet?.morale ?? 0}%`, bar: planet?.morale ?? 0, color: "#f472b6" },
    { icon: "🎯", label: "Missioni", value: loading ? "…" : `${(data?.expeditions.length ?? 0) + (data?.activeMissionCount ?? 0)}`, bar: 0, color: "#a78bfa" },
    { icon: "🌱", label: "Pikmin", value: `${available.length}/${squad.length}`, bar: squad.length ? Math.round((available.length / squad.length) * 100) : 0, color: "#4ade80" },
  ];

  return (
    <div className={styles.gameHud} role="region" aria-label="Stato pianeta e squadra">
      {stats.map((s) => (
        <div key={s.label} className={styles.hudStat} title={`${s.label}: ${s.value}`}>
          <span className={styles.hudIcon} aria-hidden>{s.icon}</span>
          <span className={styles.hudValue}>{s.value}</span>
          <span className={styles.hudLabel}>{s.label}</span>
          {s.bar > 0 && (
            <div className={styles.hudBar} aria-hidden>
              <div className={styles.hudBarFill} style={{ width: `${Math.min(100, s.bar)}%`, background: s.color }} />
            </div>
          )}
        </div>
      ))}

      {!compactExtras && (
        <>
          <div className={styles.hudStat}>
            <Link
              to="/mappa"
              onClick={hapticTap}
              className={`${styles.hudStatLink} flex flex-col items-center gap-0.5 w-full`}
              aria-label={`Bioma attivo: ${biomeLabel ?? "sconosciuto"}`}
            >
              <span className={styles.hudIcon} aria-hidden>{biomeEmoji ?? "🌍"}</span>
              <span className={`${styles.hudValue} text-[10px]`}>{biomeLabel ?? "Bioma"}</span>
              <span className={styles.hudLabel}>Zona</span>
            </Link>
          </div>

          <div className={styles.hudStat}>
            <Link
              to="/base"
              onClick={hapticTap}
              className={`${styles.hudStatLink} relative flex flex-col items-center gap-0.5 w-full`}
              aria-label={unread > 0 ? `${unread} notifiche non lette` : "Nessuna notifica"}
            >
              <Bell className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className={styles.hudValue}>{unread || 0}</span>
              <span className={styles.hudLabel}>Alert</span>
              {unread > 0 && (
                <span className="absolute top-0 right-1 h-2 w-2 rounded-full bg-rose-500 animate-pulse" aria-hidden />
              )}
            </Link>
          </div>
        </>
      )}

      {onMission.length > 0 && (
        <div className={`${styles.hudStat} hidden sm:flex`} title={`${onMission.length} Pikmin in campo`}>
          <Users className="h-3.5 w-3.5 text-amber-400" aria-hidden />
          <span className={`${styles.hudValue} text-amber-300`}>{onMission.length}</span>
          <span className={styles.hudLabel}>In campo</span>
        </div>
      )}
    </div>
  );
}
