import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Radio, Zap, Compass, Sparkles } from "lucide-react";
import { hapticScan, haptic } from "@/lib/haptic";

export interface EnergyDiscovery {
  type: string;
  color: string;
  silhouette: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCaught: (d: EnergyDiscovery) => void;
}

const PIKMIN_POOL: EnergyDiscovery[] = [
  { type: "red", color: "#ff5640", silhouette: "🌱" },
  { type: "yellow", color: "#ffd84a", silhouette: "🌱" },
  { type: "blue", color: "#4ab1ff", silhouette: "🌱" },
  { type: "purple", color: "#b07bff", silhouette: "🌱" },
  { type: "white", color: "#f0f5ff", silhouette: "🌱" },
  { type: "rock", color: "#a3a8b0", silhouette: "🌱" },
  { type: "wing", color: "#ffb7e8", silhouette: "🌱" },
  { type: "ice", color: "#9be8ff", silhouette: "🌱" },
  { type: "glow", color: "#b7ff8a", silhouette: "🌱" },
];

export function EnergyScanner({ open, onClose, onCaught }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [signal, setSignal] = useState(8); // 0-100
  const [phase, setPhase] = useState<"scan" | "flash" | "reveal" | "captured">("scan");
  const [discovery, setDiscovery] = useState<EnergyDiscovery | null>(null);
  const [glints, setGlints] = useState<{ id: number; x: number; y: number; s: number }[]>([]);

  const motionRef = useRef({ ax: 0, ay: 0, az: 0, last: 0 });
  const audioRef = useRef<{ ctx: AudioContext | null; next: number }>({ ctx: null, next: 0 });

  // start camera
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setPhase("scan");
    setSignal(8);
    setDiscovery(null);
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Fotocamera non disponibile.");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setError(e?.message || "Permesso fotocamera negato.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  // device motion → signal drift
  useEffect(() => {
    if (!open) return;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.abs((a.x ?? 0) + (a.y ?? 0) + (a.z ?? 0));
      motionRef.current.last = mag;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      motionRef.current.ax = e.alpha ?? 0;
      motionRef.current.ay = e.beta ?? 0;
    };
    // iOS permission
    const anyEvt = (window as any).DeviceMotionEvent;
    if (typeof anyEvt?.requestPermission === "function") {
      anyEvt.requestPermission().catch(() => {});
    }
    window.addEventListener("devicemotion", onMotion);
    window.addEventListener("deviceorientation", onOrient);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      window.removeEventListener("deviceorientation", onOrient);
    };
  }, [open]);

  // signal loop
  useEffect(() => {
    if (!open || phase !== "scan") return;
    // pick a random "hot direction" using orientation angle target
    const hotAngle = Math.random() * 360;
    const hotTilt = Math.random() * 60 - 30;
    const startedAt = Date.now();
    const id = setInterval(() => {
      setSignal((s) => {
        const { ax, ay, last } = motionRef.current;
        const dAngle = Math.min(180, Math.abs(((ax - hotAngle + 540) % 360) - 180));
        const dTilt = Math.abs(ay - hotTilt);
        // proximity score: 1 when perfectly aimed, ~0 when far
        const aim = Math.max(0, 1 - dAngle / 180) * Math.max(0, 1 - dTilt / 90);
        // movement adds noise + slow positive bias
        const movement = Math.min(1, last / 25);
        // gentle auto-progress so the experience is fun even without sensors
        const elapsedBoost = Math.min(0.35, (Date.now() - startedAt) / 45000);
        const target = aim * 90 + movement * 10 + elapsedBoost * 100;
        const noise = (Math.random() - 0.5) * 6;
        const next = Math.max(0, Math.min(100, s + (target - s) * 0.08 + noise));
        return next;
      });
    }, 160);
    return () => clearInterval(id);
  }, [open, phase]);

  // glints & haptics & sound from signal
  useEffect(() => {
    if (!open || phase !== "scan") return;
    if (signal > 35) {
      // spawn occasional glint
      if (Math.random() < (signal / 100) * 0.6) {
        const g = { id: Date.now() + Math.random(), x: Math.random() * 100, y: Math.random() * 100, s: 0.4 + Math.random() };
        setGlints((arr) => [...arr.slice(-8), g]);
        setTimeout(() => setGlints((arr) => arr.filter((x) => x.id !== g.id)), 900);
      }
    }
    if (signal > 60) haptic(Math.round(4 + signal / 20));
    // audio ping rate based on signal
    const now = performance.now();
    if (audioRef.current.next <= now && signal > 25) {
      try {
        let ctx = audioRef.current.ctx;
        if (!ctx) ctx = audioRef.current.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 520 + signal * 8;
        g.gain.value = 0.0001;
        o.connect(g).connect(ctx.destination);
        const t = ctx.currentTime;
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        o.start(t);
        o.stop(t + 0.2);
      } catch {}
      const interval = Math.max(120, 1400 - signal * 12);
      audioRef.current.next = now + interval;
    }
    if (signal >= 96 && phase === "scan") {
      // discovery!
      setPhase("flash");
      haptic([20, 40, 60]);
      const d = PIKMIN_POOL[Math.floor(Math.random() * PIKMIN_POOL.length)];
      setDiscovery(d);
      setTimeout(() => setPhase("reveal"), 450);
    }
  }, [signal, open, phase]);

  const confirm = () => {
    if (!discovery) return;
    setPhase("captured");
    setTimeout(() => onCaught(discovery), 600);
  };

  if (!open) return null;

  const sweepDur = Math.max(0.4, 4 - signal / 30);
  const glowIntensity = signal / 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black flex flex-col select-none"
      >
        {/* live camera */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: `brightness(${0.55 + glowIntensity * 0.35}) saturate(${0.6 + glowIntensity * 0.8}) hue-rotate(${glowIntensity * 40}deg)`,
          }}
        />

        {/* organic glow vignette pulsing with signal */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 55%, oklch(0.86 0.24 145 / ${0.05 + glowIntensity * 0.45}) 0%, transparent ${30 + glowIntensity * 40}%), radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,${0.55 - glowIntensity * 0.25}) 100%)`,
          }}
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: Math.max(0.6, 2.4 - signal / 60), repeat: Infinity }}
        />

        {/* energy particles / glints */}
        <AnimatePresence>
          {glints.map((g) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: [0, 1, 0], scale: [0.2, 1.6 * g.s, 0.4] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
              className="pointer-events-none absolute h-3 w-3 rounded-full"
              style={{
                left: `${g.x}%`,
                top: `${g.y}%`,
                background: "radial-gradient(circle, oklch(0.92 0.24 150) 0%, transparent 70%)",
                boxShadow: "0 0 24px oklch(0.86 0.24 145)",
              }}
            />
          ))}
        </AnimatePresence>

        {/* HUD top */}
        <div className="relative z-10 flex items-start justify-between p-4 text-primary">
          <div className="panel-strong px-3 py-2 backdrop-blur-md">
            <p className="text-[9px] uppercase tracking-[0.4em] text-primary/80 flex items-center gap-1">
              <Radio className="h-3 w-3 animate-pulse" /> Energy scan
            </p>
            <p className="font-display text-2xl text-glow leading-none mt-1">{Math.round(signal)}%</p>
            <div className="mt-1 h-1 w-32 rounded-full bg-primary/15 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${signal}%`, boxShadow: "0 0 12px var(--color-primary)" }}
              />
            </div>
          </div>
          <button onClick={onClose} className="panel p-2 backdrop-blur-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* central mini-radar (accelerates with signal) */}
        <div className="relative z-10 flex-1 flex items-center justify-center pointer-events-none">
          <div
            className="relative rounded-full border border-primary/30"
            style={{
              width: 240,
              height: 240,
              boxShadow: `0 0 ${20 + glowIntensity * 80}px oklch(0.86 0.24 145 / ${0.3 + glowIntensity * 0.6})`,
            }}
          >
            <div className="absolute inset-[12%] rounded-full border border-primary/25" />
            <div className="absolute inset-[28%] rounded-full border border-primary/20" />
            <div className="absolute inset-[44%] rounded-full border border-primary/20" />
            <div
              className="absolute inset-0 rounded-full overflow-hidden"
              style={{ animation: `radar-sweep ${sweepDur}s linear infinite` }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `conic-gradient(from 0deg, transparent 0deg, oklch(0.86 0.24 145 / ${0.4 + glowIntensity * 0.5}) 40deg, transparent 110deg)`,
                }}
              />
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/80">
              <Compass className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* HUD bottom hint */}
        <div className="relative z-10 px-5 pb-8 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={Math.floor(signal / 25)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] uppercase tracking-[0.3em] text-primary/80"
            >
              {signal < 20
                ? "Muoviti per cercare energia…"
                : signal < 45
                  ? "Segnale debole · gira il telefono"
                  : signal < 75
                    ? "Ti stai avvicinando…"
                    : signal < 95
                      ? "Tracciamento bloccato · resta fermo"
                      : "Contatto!"}
            </motion.p>
          </AnimatePresence>
          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
        </div>

        {/* FLASH */}
        <AnimatePresence>
          {phase === "flash" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.4] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 z-20 bg-white"
            />
          )}
        </AnimatePresence>

        {/* REVEAL — silhouette */}
        <AnimatePresence>
          {phase === "reveal" && discovery && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 14 }}
                className="relative"
              >
                <motion.div
                  className="absolute -inset-16 rounded-full"
                  style={{
                    background: `radial-gradient(circle, ${discovery.color}AA 0%, transparent 60%)`,
                  }}
                  animate={{ scale: [0.8, 1.2, 1], opacity: [0.4, 0.9, 0.7] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <div
                  className="relative h-40 w-40 rounded-full flex items-center justify-center text-7xl"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${discovery.color} 0%, oklch(0.18 0.06 250) 75%)`,
                    boxShadow: `0 0 60px ${discovery.color}`,
                  }}
                >
                  <span className="drop-shadow-[0_0_18px_rgba(255,255,255,0.6)]">🌱</span>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-center"
              >
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">// Creatura rilevata</p>
                <h2 className="font-display text-3xl text-glow mt-1">Pikmin {discovery.type.toUpperCase()}</h2>
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                onClick={() => {
                  hapticScan();
                  confirm();
                }}
                className="btn-neon mt-6 px-6 py-3 text-xs flex items-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Raccogli Pikmin
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CAPTURED — quick collect animation */}
        <AnimatePresence>
          {phase === "captured" && discovery && (
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 0.1, opacity: 0, y: -120 }}
              transition={{ duration: 0.55 }}
              className="absolute z-40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full"
              style={{
                background: `radial-gradient(circle, ${discovery.color} 0%, transparent 70%)`,
                boxShadow: `0 0 80px ${discovery.color}`,
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
