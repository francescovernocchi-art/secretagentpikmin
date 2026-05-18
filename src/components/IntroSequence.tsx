import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radar } from "./Radar";
import { Volume2, VolumeX } from "lucide-react";

const STEPS = [
  { label: "Connessione HQ…", duration: 1500 },
  { label: "Agente rilevato…", duration: 1500 },
  { label: "Missione sincronizzata", duration: 1500 },
];

const TERMINAL_LINES = [
  "> boot.sys :: handshake :: 0x1A4F",
  "> uplink :: satcom-7 :: OK",
  "> crypto :: rotating keys :: AES-256",
  "> radar :: sweep init :: 4Hz",
  "> bio-scan :: agent fingerprint :: MATCH",
  "> mission :: payload decrypt :: 87%…",
  "> mission :: payload decrypt :: 100%",
  "> uplink :: handshake complete",
];

function fmtCoord(v: number, pos: string, neg: string) {
  const dir = v >= 0 ? pos : neg;
  const abs = Math.abs(v);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = (((abs - deg) * 60 - min) * 60).toFixed(2);
  return `${deg}°${String(min).padStart(2, "0")}'${sec}"${dir}`;
}

export function IntroSequence({ onEnter }: { onEnter: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [showEnter, setShowEnter] = useState(false);
  const [terminalIdx, setTerminalIdx] = useState(0);
  const [coords, setCoords] = useState({ lat: 41.9028, lng: 12.4964 });
  const [glitch, setGlitch] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Avanzamento step
  useEffect(() => {
    if (stepIdx >= STEPS.length) {
      const t = setTimeout(() => setShowEnter(true), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIdx((i) => i + 1), STEPS[stepIdx].duration);
    return () => clearTimeout(t);
  }, [stepIdx]);

  // Terminale scroll
  useEffect(() => {
    const i = setInterval(() => {
      setTerminalIdx((idx) => (idx + 1) % (TERMINAL_LINES.length + 1));
    }, 420);
    return () => clearInterval(i);
  }, []);

  // GPS jitter
  useEffect(() => {
    const i = setInterval(() => {
      setCoords({
        lat: 41.9028 + (Math.random() - 0.5) * 0.02,
        lng: 12.4964 + (Math.random() - 0.5) * 0.02,
      });
    }, 220);
    return () => clearInterval(i);
  }, []);

  // Glitch random
  useEffect(() => {
    const i = setInterval(() => {
      if (Math.random() > 0.7) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 120);
      }
    }, 900);
    return () => clearInterval(i);
  }, []);

  // Audio futuristico (beep + sweep) opzionale
  useEffect(() => {
    if (!audioOn) {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      return;
    }
    try {
      const AC = (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext) as typeof AudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;

      const playBeep = (freq: number, dur = 0.08, delay = 0) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0;
        osc.connect(gain).connect(ctx.destination);
        const t0 = ctx.currentTime + delay;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.06, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
      };

      // sequenza ambient
      playBeep(880, 0.1, 0);
      playBeep(660, 0.1, 0.3);
      playBeep(990, 0.08, 0.6);

      const loop = setInterval(() => {
        playBeep(440 + Math.random() * 600, 0.05);
      }, 1400);
      return () => clearInterval(loop);
    } catch (e) {
      console.warn("[intro] audio non disponibile", e);
    }
  }, [audioOn]);

  return (
    <div className="fixed inset-0 grid-bg overflow-hidden">
      {/* scanlines */}
      <div className="absolute inset-0 scanline pointer-events-none" />
      {/* vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      {/* HUD top */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-3 text-[10px] font-display uppercase tracking-[0.3em] text-primary/70">
        <span>// 007-PIKMIN OS</span>
        <button
          onClick={() => setAudioOn((v) => !v)}
          className="flex items-center gap-1 panel px-2 py-1 text-primary"
          aria-label={audioOn ? "Disattiva audio" : "Attiva audio"}
        >
          {audioOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          <span>{audioOn ? "AUDIO ON" : "AUDIO OFF"}</span>
        </button>
      </div>

      {/* HUD corners */}
      <CornerBracket pos="tl" />
      <CornerBracket pos="tr" />
      <CornerBracket pos="bl" />
      <CornerBracket pos="br" />

      <div className="relative h-full flex flex-col items-center justify-center gap-6 px-6">
        {/* Radar */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={glitch ? "intro-glitch" : ""}
        >
          <Radar size={200} />
        </motion.div>

        {/* Step text */}
        <div className="h-16 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIdx}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.35 }}
              className={`font-display text-lg text-primary text-glow uppercase tracking-[0.35em] text-center ${
                glitch ? "intro-glitch" : ""
              }`}
            >
              {stepIdx < STEPS.length ? STEPS[stepIdx].label : "Sistema pronto"}
            </motion.p>
          </AnimatePresence>
          {/* progress dots */}
          <div className="flex gap-1.5 mt-3">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-colors ${
                  i < stepIdx
                    ? "bg-primary glow-soft"
                    : i === stepIdx
                      ? "bg-primary/60 animate-pulse"
                      : "bg-primary/15"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Terminal */}
        <div className="w-full max-w-sm panel p-3 h-28 overflow-hidden text-[10px] font-mono text-primary/80 leading-relaxed">
          {TERMINAL_LINES.slice(0, terminalIdx).map((l, i) => (
            <div key={i} className="opacity-80">
              {l}
            </div>
          ))}
          <div className="text-primary/60">
            <span className="animate-pulse">▍</span>
          </div>
        </div>

        {/* GPS */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-primary/70 uppercase tracking-widest">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>GPS</span>
          <span className="tabular-nums">{fmtCoord(coords.lat, "N", "S")}</span>
          <span className="tabular-nums">{fmtCoord(coords.lng, "E", "W")}</span>
        </div>

        {/* CTA */}
        <AnimatePresence>
          {showEnter && (
            <motion.button
              key="enter"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              onClick={onEnter}
              className="btn-neon px-8 py-4 text-sm relative overflow-hidden"
            >
              <span className="relative z-10">▸ Entra nella base</span>
              <span
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                  animation: "intro-shimmer 2s linear infinite",
                }}
              />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Skip */}
      <button
        onClick={onEnter}
        className="absolute bottom-4 right-4 text-[10px] font-display uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors"
      >
        skip ▸
      </button>
    </div>
  );
}

function CornerBracket({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const base = "absolute h-6 w-6 border-primary/50";
  const map: Record<string, string> = {
    tl: "top-10 left-3 border-l-2 border-t-2",
    tr: "top-10 right-3 border-r-2 border-t-2",
    bl: "bottom-10 left-3 border-l-2 border-b-2",
    br: "bottom-10 right-3 border-r-2 border-b-2",
  };
  return <div className={`${base} ${map[pos]}`} />;
}
