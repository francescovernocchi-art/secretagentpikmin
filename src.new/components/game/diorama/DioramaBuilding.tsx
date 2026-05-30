import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { hapticBuildingClick } from "@/lib/haptic";
import type { DioramaBuildingDef } from "./diorama-data";
import styles from "@/styles/village-diorama.module.css";
import { BuildingIconSvg } from "@/components/game/assets/GameIcons";

interface DioramaBuildingProps {
  def: DioramaBuildingDef;
  level: number;
  status?: "active" | "upgrading" | "locked";
  onShipClick?: () => void;
  compact?: boolean;
}

const posStyle = (def: DioramaBuildingDef): React.CSSProperties => ({
  left: `${def.x}%`,
  top: `${def.y}%`,
  zIndex: def.z,
});

export function DioramaBuilding({ def, level, status = "active", onShipClick, compact }: DioramaBuildingProps) {
  const ariaLabel = `${def.name}, livello ${level}. ${def.role}. Clicca per entrare.`;

  const inner = (
    <motion.div
      className={`${styles.building} ${status === "locked" ? styles.buildingLocked : ""}`}
      style={{ ["--bld-color" as string]: def.color }}
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.96 }}
    >
      <div className={styles.buildingShadow} aria-hidden />

      <div className={styles.buildingBody}>
        <div className={styles.buildingRoof} style={{ background: `linear-gradient(135deg, ${def.color}cc, ${def.color}66)` }} />
        <div className={styles.buildingWall} style={{ background: `linear-gradient(180deg, ${def.color}55, ${def.color}22)` }}>
          <span className={styles.buildingEmoji} aria-hidden>{def.emoji}</span>
          <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
            <BuildingIconSvg buildingKey={def.key} size={26} color={def.color} />
          </div>
        </div>
        <div className={styles.buildingBase} aria-hidden />
      </div>

      {!compact && (
        <div className={styles.buildingLabel} aria-hidden>
          <span className={styles.buildingName}>{def.name.split(" ")[0]}</span>
          <span className={styles.buildingLevel}>Lv{level}</span>
        </div>
      )}

      <div className={styles.buildingTooltip} role="tooltip">
        <p className="font-medium">{def.name}</p>
        <p className="text-muted-foreground">{def.role} · Lv{level}</p>
        <p className="text-primary text-[9px] mt-0.5">Clicca per entrare</p>
      </div>

      {status === "upgrading" && <span className={styles.buildingSpark} aria-hidden>✨</span>}
    </motion.div>
  );

  if (def.action === "ship") {
    return (
      <button
        type="button"
        className={styles.buildingHit}
        style={posStyle(def)}
        aria-label={ariaLabel}
        onClick={() => { hapticBuildingClick(); onShipClick?.(); }}
      >
        {inner}
      </button>
    );
  }

  if (def.route) {
    return (
      <Link
        to={def.route}
        onClick={hapticBuildingClick}
        className={styles.buildingHit}
        style={posStyle(def)}
        aria-label={ariaLabel}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={styles.buildingHit} style={posStyle(def)} aria-label={ariaLabel}>
      {inner}
    </div>
  );
}
