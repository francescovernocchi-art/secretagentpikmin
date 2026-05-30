/**
 * Sistema audio opzionale — WebAudio via sfx.ts, fallback silenzioso se disattivato.
 */
import { sfx } from "@/lib/sfx";

const STORAGE_KEY = "sap_audio_enabled";

export type GameSound =
  | "ui_click"
  | "building_click"
  | "radar_scan"
  | "rare_find"
  | "market_sell"
  | "mission_complete"
  | "chat_open"
  | "ship_update";

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

let enabled = typeof window !== "undefined" ? readEnabled() : true;

export function isGameAudioEnabled(): boolean {
  return enabled;
}

export function setGameAudioEnabled(on: boolean): void {
  enabled = on;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch { /* ignore */ }
  }
}

export function playGameSound(sound: GameSound): void {
  if (!enabled) return;
  switch (sound) {
    case "ui_click":
      sfx.tap();
      break;
    case "building_click":
      sfx.build();
      break;
    case "radar_scan":
      sfx.build();
      break;
    case "rare_find":
      sfx.gift();
      break;
    case "market_sell":
      sfx.upgrade();
      break;
    case "mission_complete":
      sfx.complete();
      break;
    case "chat_open":
      sfx.tap();
      setTimeout(() => { if (enabled) sfx.tap(); }, 80);
      break;
    case "ship_update":
      sfx.upgrade();
      break;
    default:
      break;
  }
}

export const gameAudio = {
  enabled: () => enabled,
  setEnabled: setGameAudioEnabled,
  play: playGameSound,
};
