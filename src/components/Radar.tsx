import { motion } from "framer-motion";
import { PIKMIN } from "@/assets/pikmin";

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
      {/* ping dot + pikmin sprite */}
      <span className="absolute left-[62%] top-[35%] h-2 w-2 rounded-full bg-primary/40 animate-radar-ping" />
      <motion.img
        src={PIKMIN.red}
        alt="Pikmin"
        className="absolute left-[58%] top-[26%] h-10 w-10 object-contain drop-shadow-[0_0_10px_oklch(0.86_0.24_145/0.7)]"
        animate={{ y: [0, -4, 0], rotate: [-3, 3, -3] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src={PIKMIN.blue}
        alt="Pikmin"
        className="absolute left-[20%] top-[60%] h-8 w-8 object-contain drop-shadow-[0_0_8px_oklch(0.65_0.22_250/0.7)]"
        animate={{ y: [0, -3, 0], rotate: [3, -3, 3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        src={PIKMIN.yellow}
        alt="Pikmin"
        className="absolute left-[70%] top-[68%] h-8 w-8 object-contain drop-shadow-[0_0_8px_oklch(0.9_0.2_95/0.6)]"
        animate={{ y: [0, -3, 0], rotate: [-2, 4, -2] }}
        transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* center */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary glow-ring" />
    </div>
  );
}
