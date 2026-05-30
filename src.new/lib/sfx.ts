// Lightweight WebAudio SFX — no external assets.
let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  }
  return ctx;
}

function tone(freq: number, dur = 0.12, type: OscillatorType = "sine", gain = 0.08, when = 0) {
  const c = ac(); if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap: () => tone(620, 0.06, "triangle", 0.05),
  build: () => { tone(440, 0.08, "square", 0.05); tone(660, 0.1, "square", 0.04, 0.08); },
  upgrade: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.12, "triangle", 0.06, i * 0.08)); },
  complete: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "sine", 0.07, i * 0.09)); },
  gift: () => { tone(880, 0.1, "sine", 0.06); tone(1175, 0.14, "sine", 0.05, 0.1); },
  sleep: () => tone(220, 0.4, "sine", 0.03),
};
