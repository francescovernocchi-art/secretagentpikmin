import { memo } from "react";
import sheet from "@/assets/pikmin-sheet.png";
import {
  ANIMATIONS,
  FRAME_W,
  FRAME_H,
  SPRITE_COLS,
  SPRITE_ROWS,
  PIKMIN_ROW,
  type PikminType,
  type PikminAnimation,
} from "@/data/pikminSprites";
import "@/styles/pikminAnimations.css";

export interface AnimatedPikminProps {
  type: PikminType;
  animation: PikminAnimation;
  /** Larghezza in px del pikmin renderizzato. Altezza calcolata. */
  size?: number;
  /** Posizione assoluta (px) opzionale: imposta left/top. */
  x?: number;
  y?: number;
  scale?: number;
  /** Inverte orizzontalmente (per direzione di marcia). */
  flip?: boolean;
  /** Aggiunge glow notturno. */
  night?: boolean;
  /** Click sul pikmin (per tooltip). */
  onClick?: () => void;
  /** Effetti extra. */
  showDust?: boolean;
  showBubbles?: boolean;
  showParticles?: boolean;
  showShadow?: boolean;
  showZ?: boolean;
}

/** Singolo Pikmin animato basato sullo sprite sheet. */
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
  const row = PIKMIN_ROW[type];

  // Dimensioni effettive preservando ratio
  const w = size;
  const h = Math.round((FRAME_H / FRAME_W) * size);

  // Scala il background per coprire l'intero sheet → posizione in % del frame
  // bgSize = (cols*100)% (rows*100)%
  // bgPos x/y = col/(cols-1) * 100%  ,  row/(rows-1) * 100%
  const col = def.startCol;
  const bgX = SPRITE_COLS > 1 ? (col / (SPRITE_COLS - 1)) * 100 : 0;
  const bgY = SPRITE_ROWS > 1 ? (row / (SPRITE_ROWS - 1)) * 100 : 0;

  const positioned = x !== undefined || y !== undefined;

  const wrapperStyle: React.CSSProperties = positioned
    ? { position: "absolute", left: x, top: y, width: w, height: h }
    : { position: "relative", width: w, height: h };

  return (
    <div
      style={{ ...wrapperStyle, transform: `scale(${scale})`, transformOrigin: "bottom center" }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={onClick ? "cursor-pointer" : undefined}
    >
      {showShadow && <span className="pikmin-shadow" />}

      {/* Wrapper per l'animazione di pose; il flip è sul figlio per non azzerare la bob */}
      <div
        className={`pikmin-anim-${animation}`}
        style={{
          width: w,
          height: h,
          position: "absolute",
          inset: 0,
          // Esposta come var CSS per override (es. globalSpeed)
          ["--pikmin-anim-dur" as any]: `${def.durationMs}ms`,
        }}
      >
        <div
          className={`pikmin-sprite ${night ? "pikmin-night-glow" : ""}`}
          style={{
            width: w,
            height: h,
            backgroundImage: `url(${sheet})`,
            backgroundSize: `${SPRITE_COLS * 100}% ${SPRITE_ROWS * 100}%`,
            backgroundPosition: `${bgX}% ${bgY}%`,
            transform: flip ? "scaleX(-1)" : undefined,
          }}
        />
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
