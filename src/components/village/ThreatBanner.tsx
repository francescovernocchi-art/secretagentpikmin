import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, CheckCircle2 } from "lucide-react";
import { VillageEvent, resolveEvent } from "@/lib/village/threats";

interface Props {
  events: VillageEvent[];
  onResolved: () => void;
}

const ICON: Record<string, JSX.Element> = {
  threat: <AlertTriangle className="h-4 w-4" />,
  threat_repelled: <Shield className="h-4 w-4" />,
};

const TONE: Record<string, string> = {
  critical: "from-red-500/30 to-red-900/20 border-red-400/50 text-red-100",
  high: "from-orange-500/30 to-orange-900/20 border-orange-400/50 text-orange-100",
  normal: "from-emerald-500/20 to-emerald-900/20 border-emerald-400/40 text-emerald-100",
};

export function ThreatBanner({ events, onResolved }: Props) {
  const open = events.filter((e) => !e.resolved_at);
  if (open.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <AnimatePresence initial={false}>
        {open.slice(0, 3).map((e) => {
          const tone = TONE[e.severity] ?? TONE.normal;
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className={`relative overflow-hidden rounded-lg border bg-gradient-to-r p-2.5 flex items-start gap-2 ${tone}`}
            >
              <span className="mt-0.5">{ICON[e.kind] ?? <AlertTriangle className="h-4 w-4" />}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold leading-tight">{e.title}</p>
                {e.description && (
                  <p className="text-[10px] opacity-80 leading-snug mt-0.5">{e.description}</p>
                )}
              </div>
              <button
                onClick={async () => {
                  await resolveEvent(e.id);
                  onResolved();
                }}
                className="shrink-0 rounded-md bg-black/30 hover:bg-black/50 px-2 py-1 text-[10px] flex items-center gap-1"
              >
                <CheckCircle2 className="h-3 w-3" /> Chiudi
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
