import { memo, useMemo } from "react";
import sheet from "@/assets/pikmin-sprites.png";
import {
  ANIMATIONS,
  FRAME_W,
  FRAME_H,
  STRIDE_X,
  PIKMIN_ROW,
  frameOffset,
  type PikminType,
  type PikminAnimation,
} from "@/data/pikminSprites";
import "@/styles/pikminAnimations.css";

export interface AnimatedPikminProps {
  type: PikminType;
  animation: PikminAnimation;
  /** Larghezza in px renderizzata (default 48). Lo sprite nativo è 128×128. */
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

/** Singolo Pikmin animato — coordinate FISSE da sprite sheet. */
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
  const first = useMemo(() => frameOffset(type, animation, 0), [type, animation]);

  // Render alla dimensione richiesta: scaliamo lo sprite usando background-size.
  // Rapporto scala = size / FRAME_W. Tutti i valori px nello sheet vanno moltiplicati.
  const k = size / FRAME_W;
  const w = size;
  const h = FRAME_H * k;
  const bgSizeX = "auto"; // mantieni dimensione naturale dello sheet... no, dobbiamo scalare
  // Usiamo background-size proporzionale: assumiamo "natural * k" via background-size none → useremo invece scaling tramite background-size con valori px scalati.
  // Per evitare di conoscere la dimensione naturale del sheet, usiamo background-size: auto e scaliamo l'elemento con transform.

  // Strategia: rendi il box a FRAME_W×FRAME_H nativi, poi `transform: scale(k * scale)`.
  const nativeW = FRAME_W;
  const nativeH = FRAME_H;

  const positioned = x !== undefined || y !== undefined;
  const wrapperStyle: React.CSSProperties = positioned
    ? { position: "absolute", left: x, top: y, width: w, height: h }
    : { position: "relative", width: w, height: h };

  // Animazione multi-frame: spostiamo background-position-x via CSS var con steps()
  const totalShift = def.frames * STRIDE_X; // px da percorrere
  const animName = def.frames > 1 ? `pikminFrames_${animation}` : undefined;

  return (
    <div
      style={{ ...wrapperStyle }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      className={onClick ? "cursor-pointer" : undefined}
    >
      {showShadow && <span className="pikmin-shadow" />}

      {/* Wrapper pose (bob/rotate) */}
      <div
        className={`pikmin-anim-${animation}`}
        style={{
          width: w,
          height: h,
          position: "absolute",
          inset: 0,
          ["--pikmin-anim-dur" as any]: `${def.durationMs}ms`,
        }}
      >
        {/* Inner sprite a dimensioni native, scalato */}
        <div
          style={{
            width: nativeW,
            height: nativeH,
            transform: `scale(${k * scale})${flip ? " scaleX(-1)" : ""}`,
            transformOrigin: "top left",
          }}
        >
          <div
            className={`pikmin-sprite ${night ? "pikmin-night-glow" : ""}`}
            style={{
              width: nativeW,
              height: nativeH,
              backgroundImage: `url(${sheet})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: bgSizeX,
              backgroundPosition: `${first.x}px ${first.y}px`,
              ["--pikmin-frame-x" as any]: `${first.x}px`,
              ["--pikmin-frame-y" as any]: `${first.y}px`,
              ["--pikmin-frame-shift" as any]: `-${totalShift}px`,
              animation: animName
                ? `${animName} ${def.durationMs}ms steps(${def.frames}) infinite`
                : undefined,
            }}
          />
        </div>
      </div>

      {/* Keyframes generati dinamicamente per ogni animazione multi-frame */}
      {animName && (
        <style>{`
          @keyframes ${animName} {
            from { background-position: ${first.x}px ${first.y}px; }
            to   { background-position: ${first.x - totalShift}px ${first.y}px; }
          }
        `}</style>
      )}

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
