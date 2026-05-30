import type { BuildingKey } from "@/components/game/diorama/diorama-data";
import { ART_PALETTE } from "@/data/artDirection";
import type { BiomeKey } from "@/types/secretPikmin";

const BIOME_COLORS: Record<string, string> = {
  bosco: ART_PALETTE.nature.primary,
  giardino: "#fde047",
  acqua: "#38bdf8",
  roccia: ART_PALETTE.ship.secondary,
  grotta: ART_PALETTE.alien.primary,
  campo: "#bef264",
  citta: "#94a3b8",
  industriale: ART_PALETTE.mission.primary,
};

interface IconProps {
  size?: number;
  className?: string;
}

export function BuildingIconSvg({ buildingKey, size = 40, color }: IconProps & { buildingKey: BuildingKey; color?: string }) {
  const c = color ?? ART_PALETTE.nature.primary;
  const icons: Record<BuildingKey, React.ReactNode> = {
    centro_controllo: (
      <>
        <rect x="8" y="14" width="24" height="18" rx="2" fill={`${c}33`} stroke={c} strokeWidth="1.5" />
        <circle cx="20" cy="20" r="4" fill={c} opacity="0.8" />
        <path d="M14 10 L20 4 L26 10 Z" fill={c} opacity="0.6" />
      </>
    ),
    magazzino: (
      <>
        <rect x="6" y="12" width="28" height="20" rx="2" fill={`${c}22`} stroke={c} strokeWidth="1.5" />
        <path d="M6 16 L20 10 L34 16" fill="none" stroke={c} strokeWidth="1" />
        <rect x="14" y="20" width="8" height="8" fill={`${c}44`} />
      </>
    ),
    accademia: (
      <>
        <rect x="10" y="16" width="20" height="14" rx="1" fill={`${c}33`} stroke={c} strokeWidth="1.5" />
        <path d="M12 16 L20 8 L28 16" fill={`${c}55`} stroke={c} strokeWidth="1" />
        <circle cx="20" cy="22" r="2" fill="#fde047" />
      </>
    ),
    laboratorio: (
      <>
        <rect x="12" y="20" width="6" height="10" rx="1" fill={`${ART_PALETTE.alien.primary}66`} stroke={ART_PALETTE.alien.primary} />
        <path d="M18 24 L24 12" stroke={c} strokeWidth="2" strokeLinecap="round" />
        <circle cx="26" cy="10" r="3" fill={ART_PALETTE.alien.primary} opacity="0.7" />
      </>
    ),
    mercato: (
      <>
        <rect x="8" y="18" width="24" height="12" rx="2" fill={`${ART_PALETTE.mission.primary}33`} stroke={ART_PALETTE.mission.primary} strokeWidth="1.5" />
        <path d="M8 18 L20 10 L32 18" fill={`${ART_PALETTE.mission.primary}44`} />
      </>
    ),
    hangar: (
      <>
        <ellipse cx="20" cy="28" rx="14" ry="4" fill="rgba(0,0,0,0.3)" />
        <path d="M20 8 L32 26 L20 30 L8 26 Z" fill="#38bdf855" stroke="#38bdf8" strokeWidth="1.5" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="drop-shadow-md" aria-hidden>
      {icons[buildingKey]}
    </svg>
  );
}

export function ShipPreviewSvg({ percent = 0, size = 120 }: { percent?: number; size?: number }) {
  const glow = percent >= 40;
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 120 90" className={glow ? "drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]" : ""} aria-hidden>
      <defs>
        <linearGradient id="previewHull" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor={ART_PALETTE.ship.secondary} />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="72" rx="38" ry="10" fill="rgba(0,0,0,0.35)" />
      <path d="M60 12 L95 58 L60 78 L25 58 Z" fill="url(#previewHull)" stroke="#38bdf8" strokeWidth="2" />
      <ellipse cx="60" cy="42" rx="10" ry="14" fill="rgba(186,230,253,0.85)" />
      <path d="M25 54 L8 64 L25 58 Z" fill="#0284c7" />
      <path d="M95 54 L112 64 L95 58 Z" fill="#0284c7" />
      {glow && <circle cx="60" cy="45" r="35" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.3" className="animate-pulse-slow" />}
    </svg>
  );
}

export function BiomeIconSvg({ biome, size = 32 }: IconProps & { biome: BiomeKey | string }) {
  const c = BIOME_COLORS[biome] ?? ART_PALETTE.nature.primary;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="14" fill={`${c}22`} stroke={c} strokeWidth="1.5" />
      <path d="M8 20 Q16 8 24 20" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="14" r="3" fill={c} opacity="0.7" />
    </svg>
  );
}

export function ResourceIconSvg({ kind = "berry", size = 28 }: IconProps & { kind?: string }) {
  const color = kind === "crystal" ? ART_PALETTE.alien.primary : ART_PALETTE.nature.primary;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="16" r="8" fill={`${color}44`} stroke={color} strokeWidth="1.5" />
      <path d="M14 6 Q16 10 14 14 Q12 10 14 6" fill={color} />
    </svg>
  );
}

export function MissionIconSvg({ size = 28 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
      <circle cx="14" cy="14" r="12" fill={`${ART_PALETTE.mission.primary}22`} stroke={ART_PALETTE.mission.primary} strokeWidth="1.5" />
      <path d="M14 8 L14 16 M14 16 L18 20" stroke={ART_PALETTE.mission.primary} strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="8" r="2" fill={ART_PALETTE.mission.primary} />
    </svg>
  );
}

export type CoreMissionKey = "ship" | "debt" | "planet" | "bestiary";

export function CoreMissionIconSvg({ missionKey, size = 40 }: IconProps & { missionKey: CoreMissionKey }) {
  const palette: Record<CoreMissionKey, { fill: string; stroke: string }> = {
    ship: { fill: "rgba(56, 189, 248, 0.35)", stroke: "#38bdf8" },
    debt: { fill: `${ART_PALETTE.mission.primary}33`, stroke: ART_PALETTE.mission.primary },
    planet: { fill: `${ART_PALETTE.nature.primary}33`, stroke: ART_PALETTE.nature.primary },
    bestiary: { fill: `${ART_PALETTE.danger.primary}33`, stroke: ART_PALETTE.danger.primary },
  };
  const { fill, stroke } = palette[missionKey];

  if (missionKey === "ship") {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <path d="M20 6 L32 28 L20 34 L8 28 Z" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <ellipse cx="20" cy="18" rx="4" ry="6" fill="rgba(186,230,253,0.85)" />
      </svg>
    );
  }
  if (missionKey === "debt") {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="14" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <text x="20" y="25" textAnchor="middle" fontSize="14" fill={stroke}>₡</text>
      </svg>
    );
  }
  if (missionKey === "planet") {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="14" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <path d="M10 22 Q20 10 30 22" fill="none" stroke={stroke} strokeWidth="2" />
        <circle cx="20" cy="16" r="3" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <rect x="8" y="10" width="24" height="22" rx="6" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <circle cx="16" cy="18" r="3" fill={stroke} />
      <circle cx="26" cy="18" r="2" fill={stroke} opacity="0.7" />
      <path d="M14 26 Q20 30 26 26" fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

export function PikminIconSvg({ type = "red", size = 28 }: IconProps & { type?: string }) {
  const colors: Record<string, string> = {
    red: "#ef4444",
    blue: "#3b82f6",
    yellow: "#eab308",
    purple: "#a855f7",
    white: "#e2e8f0",
    rock: "#78716c",
    wing: "#f472b6",
  };
  const c = colors[type] ?? colors.red;
  return (
    <svg width={size} height={size} viewBox="0 0 28 32" aria-hidden>
      <ellipse cx="14" cy="28" rx="8" ry="3" fill="rgba(0,0,0,0.25)" />
      <ellipse cx="14" cy="14" rx="9" ry="11" fill={c} />
      <circle cx="14" cy="8" r="5" fill={c} filter="brightness(1.1)" />
      <ellipse cx="10" cy="7" rx="2" ry="3" fill="white" opacity="0.9" />
      <ellipse cx="18" cy="7" rx="2" ry="3" fill="white" opacity="0.9" />
    </svg>
  );
}

export function CreaturePortraitSvg({
  emoji,
  dangerLevel = 3,
  size = 64,
}: IconProps & { emoji?: string; dangerLevel?: number }) {
  const c =
    dangerLevel >= 5
      ? ART_PALETTE.danger.primary
      : dangerLevel >= 3
        ? ART_PALETTE.alien.primary
        : ART_PALETTE.nature.primary;

  return (
    <div
      className="creature-card-portrait"
      style={{ width: size, height: size, ["--portrait-glow" as string]: `${c}44` }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64" className="absolute inset-0" aria-hidden>
        <rect x="4" y="4" width="56" height="56" rx="10" fill={`${c}18`} stroke={c} strokeWidth="1.5" />
        <path d="M12 48 Q32 20 52 48" fill="none" stroke={c} strokeWidth="1" opacity="0.4" />
        <circle cx="32" cy="28" r="12" fill={`${c}33`} />
      </svg>
      <span className="relative z-10 text-3xl drop-shadow-lg" aria-hidden>
        {emoji ?? "👾"}
      </span>
    </div>
  );
}
