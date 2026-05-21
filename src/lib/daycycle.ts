// Day/night phase helper. Uses local device time.
// Phases: alba (twilight), giorno (day), tramonto (dusk), notte (night).

export type DayPhase = "alba" | "giorno" | "tramonto" | "notte";
export type ActivityPeriod = "diurno" | "notturno" | "crepuscolare" | "sempre";

export function getDayPhase(d: Date = new Date()): DayPhase {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 6 && h < 8) return "alba";
  if (h >= 8 && h < 19) return "giorno";
  if (h >= 19 && h < 21) return "tramonto";
  return "notte";
}

export const PHASE_LABEL: Record<DayPhase, string> = {
  alba: "Alba",
  giorno: "Giorno",
  tramonto: "Tramonto",
  notte: "Notte",
};

export const PHASE_EMOJI: Record<DayPhase, string> = {
  alba: "🌅",
  giorno: "☀️",
  tramonto: "🌇",
  notte: "🌙",
};

export const PHASE_COLOR: Record<DayPhase, string> = {
  alba: "#f59e0b",
  giorno: "#facc15",
  tramonto: "#fb923c",
  notte: "#60a5fa",
};

export const PERIOD_LABEL: Record<ActivityPeriod, string> = {
  diurno: "Diurno",
  notturno: "Notturno",
  crepuscolare: "Crepuscolare",
  sempre: "Sempre attivo",
};

export const PERIOD_EMOJI: Record<ActivityPeriod, string> = {
  diurno: "☀️",
  notturno: "🌙",
  crepuscolare: "🌆",
  sempre: "♾️",
};

/** È il momento "attivo" della creatura? Quando false la creatura dorme. */
export function isActiveNow(period: ActivityPeriod | null | undefined, phase: DayPhase = getDayPhase()): boolean {
  const p = (period ?? "sempre") as ActivityPeriod;
  if (p === "sempre") return true;
  if (p === "diurno") return phase === "giorno" || phase === "alba";
  if (p === "notturno") return phase === "notte" || phase === "tramonto";
  if (p === "crepuscolare") return phase === "alba" || phase === "tramonto";
  return true;
}

/** Tinta da sovrapporre alla mappa per dare il senso del momento del giorno. */
export function phaseOverlay(phase: DayPhase): { background: string; opacity: number } {
  switch (phase) {
    case "notte":
      return { background: "radial-gradient(circle at 50% 0%, rgba(15,23,42,0.0) 0%, rgba(8,12,30,0.55) 60%, rgba(2,6,23,0.7) 100%)", opacity: 1 };
    case "tramonto":
      return { background: "linear-gradient(180deg, rgba(251,146,60,0.18) 0%, rgba(244,63,94,0.18) 60%, rgba(30,16,40,0.35) 100%)", opacity: 1 };
    case "alba":
      return { background: "linear-gradient(180deg, rgba(254,215,170,0.18) 0%, rgba(245,158,11,0.12) 60%, rgba(15,23,42,0.15) 100%)", opacity: 1 };
    case "giorno":
    default:
      return { background: "linear-gradient(180deg, rgba(250,204,21,0.04) 0%, rgba(96,165,250,0.02) 100%)", opacity: 1 };
  }
}
