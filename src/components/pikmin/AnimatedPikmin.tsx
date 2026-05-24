import { memo } from "react";
import {
  ANIMATIONS,
  type PikminAnimation,
  type PikminType,
} from "@/data/pikminSprites";
import "@/styles/pikminAnimations.css";

export interface AnimatedPikminProps {
  /** Chiave specie (dinamica, dal DB). Mantenuto compat con i 5 tipi storici. */
  type: PikminType | string;
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
  /** Sprite per animazione caricati dall'admin. */
  spriteUrls?: Partial<Record<PikminAnimation, string | null>> | null;
  /** Immagine "ritratto" della specie (usata se gli sprite per-animazione mancano). */
  fallbackImageUrl?: string | null;
  /** Colore base della specie (placeholder se nessuna immagine è disponibile). */
  tintColor?: string | null;
}

function resolveSpriteUrl(
  anim: PikminAnimation,
  urls?: AnimatedPikminProps["spriteUrls"],
  fallbackImage?: string | null,
): string | null {
  if (urls) {
    const direct = urls[anim];
    if (direct) return direct;
    if (anim === "carry" || anim === "work" || anim === "run") {
      const w = urls.walk ?? urls.idle;
      if (w) return w;
    }
    if (anim === "celebrate") {
      const c = urls.idle ?? urls.walk;
      if (c) return c;
    }
    const any = urls.idle ?? urls.walk ?? urls.attack ?? urls.sleep;
    if (any) return any;
  }
  return fallbackImage ?? null;
}

/** Pikmin animato: SOLO immagini dal database. Nessun SVG hardcoded. */
function AnimatedPikminBase({
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
  spriteUrls,
  fallbackImageUrl,
  tintColor,
}: AnimatedPikminProps) {
  const def = ANIMATIONS[animation];
  const w = size;
  const h = Math.round(size * 1.25);
  const sprite = resolveSpriteUrl(animation, spriteUrls, fallbackImageUrl);

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
          {sprite ? (
            <img
              src={sprite}
              alt=""
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                imageRendering: "auto",
                pointerEvents: "none",
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,.4))",
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "70%",
                  height: "70%",
                  borderRadius: "50% 50% 45% 45%",
                  background: tintColor ?? "#94a3b8",
                  border: "1.5px dashed rgba(255,255,255,.5)",
                  opacity: 0.7,
                }}
                title="Carica uno sprite per questa specie nella Libreria Sprite"
              />
            </div>
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
