import { motion } from "framer-motion";
import { useMemo } from "react";

interface Pikmin3DProps {
  src: string;
  size?: number;
  /** Tailwind color (oklch) for the glow halo */
  glow?: string;
  /** Animation seed to desync identical pikmin */
  seed?: number;
  className?: string;
}

/**
 * Pseudo-3D animated pikmin sprite.
 * - rotateY → fake billboard rotation (3D feel)
 * - bob (y) + tilt (rotateZ) → walking/breathing
 * - moving elliptical shadow that scales with the bob
 */
export function Pikmin3D({
  src,
  size = 56,
  glow = "oklch(0.86 0.24 145 / 0.55)",
  seed = 0,
  className = "",
}: Pikmin3DProps) {
  const cfg = useMemo(() => {
    const bobDur = 1.8 + ((seed * 0.37) % 1.2);
    const spinDur = 4.5 + ((seed * 0.91) % 2.5);
    const delay = (seed * 0.23) % 1.5;
    return { bobDur, spinDur, delay };
  }, [seed]);

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size, perspective: 600 }}
    >
      {/* ground shadow */}
      <motion.span
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-black/50 blur-[3px]"
        style={{ bottom: -size * 0.08, width: size * 0.7, height: size * 0.12 }}
        animate={{ scaleX: [1, 0.7, 1], opacity: [0.55, 0.3, 0.55] }}
        transition={{
          duration: cfg.bobDur,
          repeat: Infinity,
          ease: "easeInOut",
          delay: cfg.delay,
        }}
      />
      {/* pikmin body — bob + tilt */}
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ y: [0, -size * 0.12, 0], rotate: [-3, 3, -3] }}
        transition={{
          duration: cfg.bobDur,
          repeat: Infinity,
          ease: "easeInOut",
          delay: cfg.delay,
        }}
      >
        {/* fake 3D billboard rotation */}
        <motion.img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full object-contain select-none"
          style={{
            filter: `drop-shadow(0 0 10px ${glow})`,
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
          }}
          animate={{ rotateY: [-18, 18, -18] }}
          transition={{
            duration: cfg.spinDur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: cfg.delay,
          }}
        />
      </motion.div>
    </div>
  );
}
