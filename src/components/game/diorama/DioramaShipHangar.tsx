import { useId } from "react";
import { motion } from "framer-motion";
import type { DbSpaceshipPart } from "@/types/phase2-db";
import { ParticleEffect } from "@/components/fx/ParticleEffect";
import styles from "@/styles/village-diorama.module.css";

interface DioramaShipHangarProps {
  parts: DbSpaceshipPart[];
  percent: number;
  onClick?: () => void;
  compact?: boolean;
}

export function DioramaShipHangar({ parts, percent, onClick, compact }: DioramaShipHangarProps) {
  const uid = useId().replace(/:/g, "");
  const hullId = `shipHull-${uid}`;
  const darkId = `shipDark-${uid}`;
  const collected = parts.filter((p) => p.collected);
  const glow = percent >= 50;

  return (
    <button
      type="button"
      className={`${styles.shipHangar} relative`}
      onClick={onClick}
      aria-label={`Hangar navicella, ${percent}% completata, ${collected.length} di ${parts.length} pezzi`}
    >
      <ParticleEffect variant="ship-glow" />
      <motion.div
        className={`${styles.shipModel} ${glow ? styles.shipGlow : ""}`}
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
        aria-hidden
      >
        <svg viewBox="0 0 80 60" className={styles.shipSvg} aria-hidden>
          <defs>
            <linearGradient id={hullId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id={darkId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a5f" />
              <stop offset="100%" stopColor="#0c1929" />
            </linearGradient>
          </defs>
          <ellipse cx="40" cy="48" rx="28" ry="8" fill="#00000044" />
          <path d="M 40 8 L 62 42 L 40 52 L 18 42 Z" fill={`url(#${hullId})`} stroke="#7dd3fc" strokeWidth="1.5" />
          <path d="M 40 18 L 52 40 L 40 46 L 28 40 Z" fill={`url(#${darkId})`} opacity="0.6" />
          <ellipse cx="40" cy="28" rx="6" ry="8" fill="#bae6fd" opacity="0.8" />
          <path d="M 18 38 L 8 44 L 18 42 Z" fill="#0284c7" />
          <path d="M 62 38 L 72 44 L 62 42 Z" fill="#0284c7" />
        </svg>

        {!compact && (
          <div className={styles.shipPartsRow}>
            {parts.slice(0, 6).map((p) => (
              <span
                key={p.key}
                className={`${styles.shipPartDot} ${p.collected ? styles.shipPartOn : styles.shipPartOff}`}
                title={p.name}
                aria-hidden
              >
                {p.emoji}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      <div className={styles.shipProgressBar} aria-hidden>
        <motion.div
          className={styles.shipProgressFill}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 80 }}
        />
      </div>
      <p className={styles.shipProgressLabel} aria-hidden>
        {percent}% · {collected.length}/{parts.length}
      </p>
    </button>
  );
}
