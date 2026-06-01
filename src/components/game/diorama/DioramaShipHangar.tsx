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
  damaged?: boolean;
}

export function DioramaShipHangar({ parts, percent, onClick, compact, damaged = true }: DioramaShipHangarProps) {
  const uid = useId().replace(/:/g, "");
  const hullId = `shipHull-${uid}`;
  const darkId = `shipDark-${uid}`;
  const collected = parts.filter((p) => p.collected);
  const glow = percent >= 50;
  const hangarState = damaged ? "Area Hangar danneggiata" : "Hangar operativo";

  return (
    <button
      type="button"
      className={`${styles.shipHangar} ${damaged ? styles.shipHangarDamaged : ""} relative`}
      onClick={onClick}
      aria-label={`${hangarState}, ${percent}% completata, ${collected.length} di ${parts.length} pezzi`}
    >
      <ParticleEffect variant="ship-glow" className="opacity-35" />
      <div className={styles.hangarGround} aria-hidden>
        <span className={styles.hangarCrack} />
        <span className={styles.hangarCrack} />
        <span className={styles.hangarDebris} />
        <span className={styles.hangarDebris} />
      </div>
      <div className={styles.hangarFrame} aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <motion.div
        className={`${styles.shipModel} ${glow ? styles.shipGlow : ""}`}
        animate={{ y: damaged ? [0, -1, 0] : [0, -4, 0], rotate: damaged ? [-1, 1, -1] : 0 }}
        transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
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
          <ellipse cx="40" cy="50" rx="30" ry="7" fill="#00000055" />
          <path d="M 40 10 L 60 42 L 40 51 L 20 42 Z" fill={damaged ? "none" : `url(#${hullId})`} stroke="#7dd3fc" strokeWidth="2" strokeDasharray={damaged ? "4 3" : undefined} opacity={damaged ? "0.7" : "1"} />
          <path d="M 41 18 L 51 39 L 40 45 L 30 39 Z" fill={`url(#${darkId})`} opacity={damaged ? "0.32" : "0.6"} />
          <ellipse cx="40" cy="29" rx="6" ry="8" fill="#bae6fd" opacity={damaged ? "0.45" : "0.8"} />
          <path d="M 20 39 L 10 44 L 20 43 Z" fill="#0284c7" opacity={damaged ? "0.35" : "1"} />
          <path d="M 60 39 L 70 44 L 60 43 Z" fill="#0284c7" opacity={damaged ? "0.35" : "1"} />
          {damaged && (
            <>
              <path d="M 26 43 L 20 51 M 54 42 L 60 50" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="55" cy="18" r="2" fill="#f97316" opacity="0.8" />
            </>
          )}
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
        {damaged ? "Hangar danneggiato" : "Hangar"} · {percent}% · {collected.length}/{parts.length}
      </p>
    </button>
  );
}
