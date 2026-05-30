import { useMemo } from "react";

export type ParticleVariant =
  | "energy"
  | "dust"
  | "ship-glow"
  | "pickup"
  | "mission"
  | "chat"
  | "radar";

interface ParticleEffectProps {
  variant: ParticleVariant;
  className?: string;
  density?: "low" | "medium";
}

const DOT_POSITIONS = [
  { left: "12%", top: "70%", delay: "0s" },
  { left: "28%", top: "55%", delay: "0.4s" },
  { left: "45%", top: "80%", delay: "0.8s" },
  { left: "62%", top: "60%", delay: "1.2s" },
  { left: "78%", top: "75%", delay: "0.2s" },
  { left: "88%", top: "45%", delay: "1.6s" },
];

export function ParticleEffect({ variant, className = "", density = "low" }: ParticleEffectProps) {
  const count = density === "medium" ? 6 : 4;
  const dots = useMemo(() => DOT_POSITIONS.slice(0, count), [count]);

  if (variant === "radar") {
    return (
      <div className={`fx-layer fx-radar ${className}`} aria-hidden>
        <span className="fx-ring" style={{ animationDelay: "0s" }} />
        <span className="fx-ring" style={{ animationDelay: "0.8s" }} />
      </div>
    );
  }

  if (variant === "ship-glow") {
    return <div className={`fx-layer fx-ship-glow ${className}`} aria-hidden />;
  }

  const fxClass =
    variant === "energy"
      ? "fx-energy"
      : variant === "dust"
        ? "fx-dust"
        : variant === "pickup"
          ? "fx-pickup"
          : variant === "mission"
            ? "fx-mission"
            : "fx-chat";

  return (
    <div className={`fx-layer ${fxClass} ${className}`} aria-hidden>
      {dots.map((d, i) => (
        <span
          key={i}
          className="fx-dot"
          style={{ left: d.left, top: d.top, animationDelay: d.delay }}
        />
      ))}
    </div>
  );
}
