import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { hapticBuildingClick } from "@/lib/haptic";
import type { DioramaBuildingDef } from "./diorama-data";
import styles from "@/styles/village-diorama.module.css";
import { BuildingIconSvg } from "@/components/game/assets/GameIcons";

export type DioramaVisualState =
  | "locked"
  | "buildable"
  | "under_construction"
  | "level_1"
  | "level_2"
  | "level_3"
  | "level_4"
  | "level_5";

interface DioramaBuildingProps {
  def: DioramaBuildingDef;
  level: number;
  status?: string;
  visualState?: DioramaVisualState;
  onShipClick?: () => void;
  compact?: boolean;
}

const posStyle = (def: DioramaBuildingDef): React.CSSProperties => ({
  left: `${def.x}%`,
  top: `${def.y}%`,
  zIndex: def.z,
});

const STATUS_LABELS: Record<DioramaVisualState, string> = {
  locked: "bloccato",
  buildable: "fondamenta pronte",
  under_construction: "in costruzione",
  level_1: "livello 1",
  level_2: "livello 2",
  level_3: "livello 3",
  level_4: "livello 4",
  level_5: "livello 5",
};

function clampLevel(level: number) {
  return Math.min(5, Math.max(1, Math.round(level || 1)));
}

function normalizeState(status: string | undefined, level: number): DioramaVisualState {
  const raw = status?.toLowerCase();
  if (
    raw === "locked" ||
    raw === "buildable" ||
    raw === "under_construction" ||
    raw === "level_1" ||
    raw === "level_2" ||
    raw === "level_3" ||
    raw === "level_4" ||
    raw === "level_5"
  ) {
    return raw;
  }
  if (raw === "upgrading" || raw === "building" || raw === "constructing" || raw === "in_progress") return "under_construction";
  return `level_${clampLevel(level)}` as DioramaVisualState;
}

function stateLevel(state: DioramaVisualState, fallback: number) {
  return state.startsWith("level_") ? Number(state.replace("level_", "")) : clampLevel(fallback);
}

function isFinishedState(state: DioramaVisualState) {
  return state.startsWith("level_");
}

function BuildableSite({ def }: { def: DioramaBuildingDef }) {
  return (
    <div className={styles.buildingSite}>
      <div className={styles.siteShadow} aria-hidden />
      <div className={styles.foundation}>
        <span className={styles.foundationGrid} />
        <span className={styles.foundationStake} />
        <span className={styles.foundationStake} />
        <span className={styles.foundationStake} />
        <span className={styles.foundationStake} />
      </div>
      <span className={styles.materialPile} aria-hidden />
      <span className={styles.materialCrate} aria-hidden />
      <span className={styles.siteIcon} aria-hidden>{def.emoji}</span>
    </div>
  );
}

function LockedSite({ def }: { def: DioramaBuildingDef }) {
  return (
    <div className={styles.lockedSite}>
      <div className={styles.siteShadow} aria-hidden />
      <div className={styles.lockedGround}>
        <span className={styles.lockedSilhouette} />
        <span className={styles.lockGlyph} aria-hidden>🔒</span>
      </div>
      <span className={styles.requirementTag}>{def.requirement}</span>
    </div>
  );
}

function ConstructionSite({ def }: { def: DioramaBuildingDef }) {
  return (
    <div className={styles.constructionSite}>
      <BuildableSite def={def} />
      <span className={styles.scaffoldBeam} />
      <span className={styles.scaffoldBeam} />
      <span className={styles.scaffoldDeck} />
      <span className={styles.tarp} />
      <span className={styles.workPikmin} aria-hidden>🌱</span>
      <span className={styles.workPikmin} aria-hidden>🌱</span>
    </div>
  );
}

function FinishedBuilding({ def, level }: { def: DioramaBuildingDef; level: number }) {
  return (
    <>
      <div className={styles.buildingShadow} aria-hidden />

      <div className={styles.buildingBody}>
        {level >= 4 && <span className={styles.buildingTower} aria-hidden />}
        {level >= 2 && <span className={styles.buildingAntenna} aria-hidden />}
        <div className={styles.buildingRoof} style={{ background: `linear-gradient(135deg, ${def.color}dd, ${def.color}66)` }} />
        <div className={styles.buildingWall} style={{ background: `linear-gradient(180deg, ${def.color}66, ${def.color}22)` }}>
          <span className={styles.buildingEmoji} aria-hidden>{def.emoji}</span>
          <div className="absolute inset-0 flex items-center justify-center opacity-45 pointer-events-none">
            <BuildingIconSvg buildingKey={def.key} size={26} color={def.color} />
          </div>
          {level >= 3 && <span className={styles.buildingWindow} aria-hidden />}
          {level >= 5 && <span className={styles.buildingCoreGlow} aria-hidden />}
        </div>
        {level >= 3 && <span className={styles.sideModule} aria-hidden />}
        <div className={styles.buildingBase} aria-hidden />
      </div>
    </>
  );
}

export function DioramaBuilding({ def, level, status = "active", visualState, onShipClick, compact }: DioramaBuildingProps) {
  const state = visualState ?? normalizeState(status, level);
  const visualLevel = stateLevel(state, level);
  const statusLabel = STATUS_LABELS[state];
  const ariaLabel = `${def.name}, ${statusLabel}. ${def.role}. ${def.requirement}. Clicca per entrare.`;

  const inner = (
    <motion.div
      className={`${styles.building} ${state === "locked" ? styles.buildingLocked : ""}`}
      style={{ ["--bld-color" as string]: def.color }}
      data-state={state}
      data-kind={def.key}
      whileHover={{ scale: state === "locked" ? 1.02 : 1.06, y: state === "locked" ? -1 : -4 }}
      whileTap={{ scale: 0.96 }}
    >
      {state === "locked" && <LockedSite def={def} />}
      {state === "buildable" && <BuildableSite def={def} />}
      {state === "under_construction" && <ConstructionSite def={def} />}
      {isFinishedState(state) && <FinishedBuilding def={def} level={visualLevel} />}

      {!compact && (
        <div className={styles.buildingLabel} aria-hidden>
          <span className={styles.buildingName}>{def.name.split(" ")[0]}</span>
          <span className={styles.buildingLevel}>
            {isFinishedState(state) ? `Lv${visualLevel}` : state === "under_construction" ? "Cantiere" : state === "buildable" ? "Fondamenta" : "Bloccato"}
          </span>
        </div>
      )}

      <div className={styles.buildingTooltip} role="tooltip">
        <p className="font-medium">{def.name}</p>
        <p className="text-muted-foreground">{def.role} · {statusLabel}</p>
        {(state === "locked" || state === "buildable") && <p className="text-amber-200/90">{def.requirement}</p>}
        <p className="text-primary text-[9px] mt-0.5">Clicca per entrare</p>
      </div>

      {state === "under_construction" && <span className={styles.buildingSpark} aria-hidden>🔨</span>}
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
