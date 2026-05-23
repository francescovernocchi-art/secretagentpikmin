import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { sfx } from "@/lib/sfx";

interface Props {
  show: boolean;
  label?: string;
  onDone?: () => void;
}

const CONFETTI = Array.from({ length: 28 }).map((_, i) => i);
const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];

export function CelebrationOverlay({ show, label = "Costruzione completata!", onDone }: Props) {
  useEffect(() => {
    if (!show) return;
    sfx.complete();
    const t = setTimeout(() => onDone?.(), 2200);
    return () => clearTimeout(t);
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="panel-strong px-5 py-3 text-center bg-night/90 border-2 border-primary/60"
          >
            <p className="text-3xl">🎉✨🌟</p>
            <p className="font-display text-lg text-glow mt-1">{label}</p>
          </motion.div>
          {CONFETTI.map((i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 0.3;
            const dur = 1.4 + Math.random() * 0.9;
            const rot = Math.random() * 720 - 360;
            const color = COLORS[i % COLORS.length];
            return (
              <motion.span
                key={i}
                initial={{ top: "-5%", left: `${left}%`, opacity: 1, rotate: 0 }}
                animate={{ top: "105%", rotate: rot, opacity: [1, 1, 0] }}
                transition={{ duration: dur, delay, ease: "easeIn" }}
                className="absolute h-2 w-2 rounded-sm"
                style={{ background: color }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
