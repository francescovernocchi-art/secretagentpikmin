import { motion } from "framer-motion";
import { AnimatedPikmin } from "@/components/pikmin/AnimatedPikmin";
import { PIKMIN_TYPE_TO_SPRITE, statusToAnimation, statusToRoleLabel, PIKMIN_PATROL_POINTS } from "./diorama-data";
import type { PikminUnit } from "@/types/secretPikmin";
import styles from "@/styles/village-diorama.module.css";

interface DioramaPikminActorProps {
  pikmin: PikminUnit;
  index: number;
  compact?: boolean;
}

export function DioramaPikminActor({ pikmin, index, compact }: DioramaPikminActorProps) {
  const spriteType = PIKMIN_TYPE_TO_SPRITE[pikmin.type] ?? "red";
  const anim = statusToAnimation(pikmin.status, pikmin.specialization);
  const role = statusToRoleLabel(pikmin.status, pikmin.specialization);
  const patrol = PIKMIN_PATROL_POINTS[index % PIKMIN_PATROL_POINTS.length];
  const size = compact ? 26 : 32;

  return (
    <motion.div
      className={styles.pikminActor}
      style={{ left: `${patrol.x}%`, top: `${patrol.y}%`, zIndex: 60 + index }}
      animate={{
        x: [0, 8, 4, -6, 0],
        y: [0, -2, 1, -1, 0],
      }}
      transition={{
        repeat: Infinity,
        duration: 4 + index * 0.6,
        ease: "easeInOut",
        delay: index * 0.3,
      }}
      title={`${pikmin.name} · ${role}`}
      aria-label={`${pikmin.name}, ${pikmin.type}, ${role}`}
    >
      <div className={styles.pikminShadow} />
      <AnimatedPikmin
        type={spriteType}
        animation={anim}
        size={size}
        showShadow={false}
        showDust={anim === "run" || anim === "carry"}
      />

      {!compact && (
        <div className={styles.pikminBadge}>
          {pikmin.specBadge && <span className={styles.pikminSpecBadge}>{pikmin.specBadge}</span>}
          <span className={styles.pikminRole}>{role}</span>
        </div>
      )}

      <div className={styles.pikminTooltip}>
        <p className="font-medium">{pikmin.name}</p>
        <p className="text-muted-foreground">Lv{pikmin.level} · {pikmin.type}</p>
        <p className="text-primary">{role}</p>
      </div>
    </motion.div>
  );
}
