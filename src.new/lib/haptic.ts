// Piccolo helper per vibrazione tattile (no-op se non supportata).
import { gameAudio } from "@/lib/game-audio";

export function haptic(pattern: number | number[] = 12) {
  if (typeof window === "undefined") return;
  try {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export function hapticTap() {
  haptic(8);
  gameAudio.play("ui_click");
}

export function hapticBuildingClick() {
  haptic(10);
  gameAudio.play("building_click");
}

export function hapticScan() {
  haptic([10, 30, 10]);
  gameAudio.play("radar_scan");
}

export function hapticSuccess() {
  haptic([20, 40, 60]);
  gameAudio.play("mission_complete");
}
