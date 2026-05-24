import { motion } from "framer-motion";

interface Props {
  progress: number; // 0..1
  remainingLabel?: string;
}

/** Cantiere visibile durante under_construction / upgrading: impalcatura + timer. */
export function ConstructionSite({ progress, remainingLabel }: Props) {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <motion.div
        className="relative"
        style={{ width: 64, height: 64 }}
        animate={{ rotate: [-2, 2, -2] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* impalcatura */}
        <svg viewBox="0 0 64 64" className="absolute inset-0">
          <polygon points="32,6 6,58 58,58" fill="#c9a96b" stroke="#7d5a2e" strokeWidth="2" />
          <line x1="14" y1="40" x2="50" y2="40" stroke="#7d5a2e" strokeWidth="2" />
          <line x1="22" y1="22" x2="42" y2="22" stroke="#7d5a2e" strokeWidth="2" />
          <line x1="32" y1="6"  x2="32" y2="58" stroke="#7d5a2e" strokeWidth="2" strokeDasharray="3 3" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🔨</span>
      </motion.div>
      <span className="w-14 h-1.5 bg-black/60 rounded-full overflow-hidden">
        <span className="block h-full bg-amber-400" style={{ width: `${Math.round(progress * 100)}%` }} />
      </span>
      {remainingLabel && (
        <span className="text-[9px] text-amber-200 font-mono">{remainingLabel}</span>
      )}
    </div>
  );
}
