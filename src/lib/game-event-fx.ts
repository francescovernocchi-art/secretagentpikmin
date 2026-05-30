/**
 * Fase 6.1 — collegamento particelle + audio agli eventi di gioco reali.
 */
import type { ParticleVariant } from "@/components/fx/ParticleEffect";
import { gameAudio, type GameSound } from "@/lib/game-audio";
import type { ScanDiscovery } from "@/types/phase2-db";

export type GameFxEvent =
  | "pickup"
  | "rare_find"
  | "ship_part"
  | "mission_complete"
  | "market_sell"
  | "chat_message"
  | "scanner_complete";

const FX_CONFIG: Record<GameFxEvent, { particle: ParticleVariant; sound?: GameSound }> = {
  pickup: { particle: "pickup" },
  rare_find: { particle: "energy", sound: "rare_find" },
  ship_part: { particle: "ship-glow", sound: "ship_update" },
  mission_complete: { particle: "mission", sound: "mission_complete" },
  market_sell: { particle: "pickup", sound: "market_sell" },
  chat_message: { particle: "chat" },
  scanner_complete: { particle: "radar", sound: "radar_scan" },
};

const EVENT_NAME = "sap:game-fx";
let lastEmit = { key: "", ts: 0 };

export interface GameFxDetail {
  event: GameFxEvent;
  particle: ParticleVariant;
}

export function triggerGameFx(
  event: GameFxEvent,
  options?: { sound?: boolean; particle?: boolean },
): void {
  const playSound = options?.sound !== false;
  const showParticle = options?.particle !== false;
  const cfg = FX_CONFIG[event];

  const dedupeKey = `${event}:${playSound}:${showParticle}`;
  const now = Date.now();
  if (dedupeKey === lastEmit.key && now - lastEmit.ts < 280) return;
  lastEmit = { key: dedupeKey, ts: now };

  if (playSound && cfg.sound) {
    gameAudio.play(cfg.sound);
  }

  if (showParticle && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<GameFxDetail>(EVENT_NAME, {
        detail: { event, particle: cfg.particle },
      }),
    );
  }
}

export function emitScanDiscoveryFx(discovery: ScanDiscovery): void {
  triggerGameFx("scanner_complete");

  switch (discovery.targetType) {
    case "pezzo_navicella":
      triggerGameFx("ship_part", { sound: false });
      break;
    case "mostro":
    case "pikmin_selvatico":
      triggerGameFx("rare_find", { sound: false });
      break;
    default:
      triggerGameFx("pickup", { sound: false });
      break;
  }
}

export const GAME_FX_EVENT = EVENT_NAME;
