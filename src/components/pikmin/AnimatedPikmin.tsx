import { memo } from "react";
import {
  ANIMATIONS,
  type PikminAnimation,
  type PikminType,
} from "@/data/pikminSprites";
import "@/styles/pikminAnimations.css";

export interface AnimatedPikminProps {
  type: PikminType;
  animation: PikminAnimation;
  size?: number;
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  night?: boolean;
  onClick?: () => void;
  showDust?: boolean;
  showBubbles?: boolean;
  showParticles?: boolean;
  showShadow?: boolean;
  showZ?: boolean;
}

const BODY: Record<PikminType, string> = {
  red:    "#ef4444",
  blue:   "#3b82f6",
  yellow: "#facc15",
  purple: "#8b5cf6",
  white:  "#f1f5f9",
};
const BODY_DARK: Record<PikminType, string> = {
  red:    "#b91c1c",
  blue:   "#1e40af",
  yellow: "#ca8a04",
  purple: "#5b21b6",
  white:  "#cbd5e1",
};
const EYE: Record<PikminType, string> = {
  red: "#0f172a", blue: "#0f172a", yellow: "#0f172a", purple: "#0f172a", white: "#dc2626",
};

/** Pikmin disegnato in SVG. Niente sprite sheet, niente crop. */
function PikminBody({ type }: { type: PikminType }) {
  const fill = BODY[type];
  const shade = BODY_DARK[type];
  const eye = EYE[type];

  // Forma base diversa per viola (più grosso) e bianco (più piccolo)
  const bodyScale = type === "purple" ? 1.15 : type === "white" ? 0.9 : 1;
  const bodyW = 28 * bodyScale;
  const bodyH = 34 * bodyScale;

  return (
    <svg viewBox="0 0 60 80" width="100%" height="100%" style={{ overflow: "visible" }}>
      {/* Gambe */}
      <g className="pikmin-legs">
        <rect x="24" y="62" width="3" height="10" rx="1.5" fill={shade} />
        <rect x="33" y="62" width="3" height="10" rx="1.5" fill={shade} />
        <ellipse cx="25.5" cy="73" rx="3" ry="1.6" fill="#0f172a" />
        <ellipse cx="34.5" cy="73" rx="3" ry="1.6" fill="#0f172a" />
      </g>

      {/* Orecchie gialle */}
      {type === "yellow" && (
        <>
          <path d="M14 38 Q4 30 10 22 L18 36 Z" fill={fill} stroke={shade} strokeWidth="1.2" />
          <path d="M46 38 Q56 30 50 22 L42 36 Z" fill={fill} stroke={shade} strokeWidth="1.2" />
        </>
      )}

      {/* Corpo */}
      <ellipse cx="30" cy="46" rx={bodyW / 2} ry={bodyH / 2} fill={fill} stroke={shade} strokeWidth="1.4" />

      {/* Braccia */}
      <g className="pikmin-arms">
        <rect x={30 - bodyW / 2 - 3} y="46" width="3" height="11" rx="1.5" fill={shade} transform="rotate(-12 16 50)" />
        <rect x={30 + bodyW / 2} y="46" width="3" height="11" rx="1.5" fill={shade} transform="rotate(12 46 50)" />
      </g>

      {/* Occhi (bianchi tondi) */}
      <g>
        <ellipse cx="25" cy="42" rx="3.4" ry="4.4" fill="#fff" />
        <ellipse cx="35" cy="42" rx="3.4" ry="4.4" fill="#fff" />
        <ellipse cx="25" cy="43" rx="1.5" ry="2.2" fill={eye} />
        <ellipse cx="35" cy="43" rx="1.5" ry="2.2" fill={eye} />
      </g>

      {/* Naso rosso (appuntito), niente bocca */}
      {type === "red" && (
        <path d="M28 48 L30 53 L32 48 Z" fill={shade} />
      )}
      {/* Bocca blu, niente naso */}
      {type === "blue" && (
        <path d="M27 49 Q30 53 33 49" stroke={shade} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      )}

      {/* Stelo + foglia */}
      <line x1="30" y1="30" x2="30" y2="20" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M30 20 Q22 14 24 8 Q32 10 30 20 Z" fill="#22c55e" stroke="#166534" strokeWidth="1" />
      <path d="M30 20 Q38 14 36 8 Q28 10 30 20 Z" fill="#16a34a" stroke="#166534" strokeWidth="1" />
    </svg>
  );
}

/** Singolo Pikmin animato — pure SVG/CSS. */
function AnimatedPikminBase({
  type,
  animation,
  size = 48,
  x,
  y,
  scale = 1,
  flip,
  night,
  onClick,
  showDust,
  showBubbles,
  showParticles,
  showShadow = true,
  showZ,
}: AnimatedPikminProps) {
  const def = ANIMATIONS[animation];
  const w = size;
  const h = Math.round(size * 1.25);

  const positioned = x !== undefined || y !== undefined;
  const wrapperStyle: React.CSSProperties = positioned
    ? { position: "absolute", left: x, top: y, width: w, height: h }
    : { position: "relative", width: w, height: h };

  const sleeping = animation === "sleep";

  return (
    <div
      style={wrapperStyle}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={onClick ? "cursor-pointer" : undefined}
    >
      {showShadow && <span className="pikmin-shadow" />}

      <div
        className={`pikmin-anim-${animation}`}
        style={{
          width: w,
          height: h,
          position: "absolute",
          inset: 0,
          ["--pikmin-anim-dur" as any]: `${def.durationMs}ms`,
          transform: `${flip ? "scaleX(-1)" : ""}${sleeping ? " rotate(-75deg)" : ""}`,
          transformOrigin: "center bottom",
          filter: night ? "drop-shadow(0 0 4px rgba(255,255,200,0.5))" : undefined,
        }}
      >
        <div style={{ width: "100%", height: "100%", transform: `scale(${scale})`, transformOrigin: "center bottom" }}>
          <PikminBody type={type} />

          {/* Oggetto trasportato */}
          {animation === "carry" && (
            <div style={{
              position: "absolute",
              left: "30%", top: "8%",
              width: "40%", height: "22%",
              background: "#a16207",
              border: "1.5px solid #422006",
              borderRadius: 2,
            }} />
          )}

          {/* Martello/strumento durante lavoro */}
          {animation === "work" && (
            <div style={{
              position: "absolute",
              right: "-10%", top: "40%",
              width: "30%", height: "8%",
              background: "#52525b",
              borderRadius: 2,
              transformOrigin: "left center",
              animation: "pikminWork var(--pikmin-anim-dur, 0.5s) ease-in-out infinite",
            }} />
          )}
        </div>
      </div>

      {showDust && (
        <>
          <span className="pikmin-dust" style={{ left: "20%", animationDelay: "0ms" }} />
          <span className="pikmin-dust" style={{ left: "60%", animationDelay: "180ms" }} />
        </>
      )}
      {showBubbles && (
        <>
          <span className="pikmin-bubble" style={{ left: "70%", top: "20%" }} />
          <span className="pikmin-bubble" style={{ left: "80%", top: "40%", animationDelay: "500ms" }} />
        </>
      )}
      {showParticles && (
        <>
          <span className="pikmin-particle" style={{ left: "20%", top: "10%", background: "#facc15" }} />
          <span className="pikmin-particle" style={{ left: "60%", top: "15%", background: "#fb7185", animationDelay: "200ms" }} />
          <span className="pikmin-particle" style={{ left: "40%", top: "5%",  background: "#60a5fa", animationDelay: "400ms" }} />
        </>
      )}
      {showZ && <span className="pikmin-z">z z z</span>}
    </div>
  );
}

export const AnimatedPikmin = memo(AnimatedPikminBase);
