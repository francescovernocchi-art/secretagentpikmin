export function Radar({ size = 220 }: { size?: number }) {
  return (
    <div
      className="relative mx-auto rounded-full"
      style={{ width: size, height: size }}
    >
      {/* outer glow */}
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
      {/* concentric rings */}
      <div className="absolute inset-0 rounded-full border border-primary/40" />
      <div className="absolute inset-[12%] rounded-full border border-primary/30" />
      <div className="absolute inset-[28%] rounded-full border border-primary/25" />
      <div className="absolute inset-[44%] rounded-full border border-primary/20" />
      {/* crosshair */}
      <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-primary/20" />
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-px bg-primary/20" />
      {/* sweep */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div
          className="absolute inset-0 animate-radar-sweep origin-center"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, oklch(0.86 0.24 145 / 0.55) 30deg, transparent 90deg)",
          }}
        />
      </div>
      {/* ping dots (Pikmin nascosti, visibili solo dalla fotocamera) */}
      <span className="absolute left-[62%] top-[30%] h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--color-primary)] animate-radar-ping" />
      <span className="absolute left-[22%] top-[60%] h-2 w-2 rounded-full bg-primary/80 shadow-[0_0_10px_var(--color-primary)] animate-radar-ping" style={{ animationDelay: "0.6s" }} />
      <span className="absolute left-[70%] top-[68%] h-2 w-2 rounded-full bg-primary/70 shadow-[0_0_10px_var(--color-primary)] animate-radar-ping" style={{ animationDelay: "1.2s" }} />
      {/* center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary glow-ring" />
    </div>
  );
}
