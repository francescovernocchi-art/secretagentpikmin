import { motion } from "framer-motion";
import type { DayPhase } from "@/lib/daycycle";

interface Props {
  phase: DayPhase;
}

/** Sole/luna che attraversa la scena. */
export function DayNightLayer({ phase }: Props) {
  const isNight = phase === "notte" || phase === "tramonto";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute"
        animate={{
          left: phase === "alba" ? ["10%", "20%"] : phase === "giorno" ? ["20%", "75%"] : phase === "tramonto" ? ["75%", "90%"] : ["10%", "85%"],
          top: phase === "giorno" ? ["18%", "8%", "18%"] : ["25%", "15%"],
        }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        style={{
          fontSize: 36,
          filter: `drop-shadow(0 0 18px ${isNight ? "#bfdbfe" : "#fde68a"})`,
        }}
      >
        {isNight ? "🌙" : "☀️"}
      </motion.div>
      {/* stars at night */}
      {isNight && (
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-white"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 40}%`,
                boxShadow: "0 0 6px #fff",
              }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
