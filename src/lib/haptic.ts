// Piccolo helper per vibrazione tattile (no-op se non supportata).
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
}

export function hapticScan() {
  haptic([10, 30, 10]);
}

export function hapticSuccess() {
  haptic([20, 40, 60]);
}
