import { PIKMIN } from "@/assets/pikmin";
import { Pikmin3D } from "@/components/Pikmin3D";

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
      {/* ping dot + pikmin 3D sprites */}
      <span className="absolute left-[62%] top-[35%] h-2 w-2 rounded-full bg-primary/40 animate-radar-ping" />
      <div className="absolute left-[58%] top-[26%]">
        <Pikmin3D src={PIKMIN.red} size={40} glow="oklch(0.86 0.24 145 / 0.7)" seed={1} />
      </div>
      <div className="absolute left-[20%] top-[60%]">
        <Pikmin3D src={PIKMIN.blue} size={32} glow="oklch(0.65 0.22 250 / 0.7)" seed={2} />
      </div>
      <div className="absolute left-[70%] top-[68%]">
        <Pikmin3D src={PIKMIN.yellow} size={32} glow="oklch(0.9 0.2 95 / 0.6)" seed={3} />
      </div>
      {/* center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary glow-ring" />
    </div>
  );
}
