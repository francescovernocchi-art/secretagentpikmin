import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ArrowRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMarket, useMissionProgress } from "@/hooks/useGameData";
import { transformInventory, TRANSFORM_LABELS, getTransformableCounts } from "@/lib/game/transformations";
import { fetchInventory } from "@/lib/game/inventory";
import { agentKeyFromSession } from "@/lib/game/planet";
import { getSession } from "@/lib/session";
import { hapticTap } from "@/lib/haptic";
import { triggerGameFx } from "@/lib/game-event-fx";
import { ResourceIconSvg } from "@/components/game/assets/GameIcons";
import type { TransformTarget } from "@/types/phase3-db";

interface ResourceTransformPanelProps {
  compact?: boolean;
}

const PREVIEW: Record<TransformTarget, { emoji: string; label: string; color: string }> = {
  food: { emoji: "🌍", label: "+Cibo pianeta", color: "var(--ad-nature)" },
  energy: { emoji: "⚡", label: "+Energia", color: "var(--ad-alien)" },
  materials: { emoji: "🔩", label: "Materiali raffinati", color: "var(--ad-ship-glow)" },
  credits: { emoji: "💰", label: "Crediti al debito", color: "var(--ad-mission)" },
};

export function ResourceTransformPanel({ compact = false }: ResourceTransformPanelProps) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKeyFromSession(session?.role);
  const { reload: reloadMarket } = useMarket();
  const { reload: reloadProgress } = useMissionProgress();
  const [busy, setBusy] = useState<TransformTarget | null>(null);
  const [flash, setFlash] = useState<TransformTarget | null>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const [counts, setCounts] = useState({ food: 0, energy: 0, materials: 0, credits: 0 });

  useEffect(() => {
    fetchInventory(agent).then(({ data }) => setCounts(getTransformableCounts(data)));
  }, [agent, busy]);

  const handleTransform = async (target: TransformTarget) => {
    hapticTap();
    setBusy(target);
    try {
      const result = await transformInventory(agent, target);
      if (result.success) {
        triggerGameFx("pickup");
        setFlash(target);
        setLastMsg(result.message);
        window.setTimeout(() => setFlash(null), 1200);
        toast.success(result.message);
        await Promise.all([reloadMarket(), reloadProgress()]);
        const { data } = await fetchInventory(agent);
        setCounts(getTransformableCounts(data));
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(null);
    }
  };

  const targets: TransformTarget[] = ["food", "energy", "materials", "credits"];

  return (
    <section className="space-y-3">
      {!compact && (
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Laboratorio</p>
          <h2 className="font-display text-xl text-glow">Trasformazione risorse</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Converti l'inventario in cibo, energia, materiali o crediti per le missioni planetarie.
          </p>
        </header>
      )}

      <AnimatePresence>
        {lastMsg && flash && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-[10px] text-emerald-400 flex items-center gap-1"
          >
            <Zap className="h-3 w-3" /> {lastMsg}
          </motion.p>
        )}
      </AnimatePresence>

      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {targets.map((t) => {
          const meta = TRANSFORM_LABELS[t];
          const count = counts[t];
          const preview = PREVIEW[t];
          const iconKind = t === "energy" || t === "materials" ? "crystal" : "berry";
          return (
            <button
              key={t}
              onClick={() => handleTransform(t)}
              disabled={busy !== null || count === 0}
              className={`market-card transform-card p-3 text-left active:scale-[0.98] transition disabled:opacity-50 ${flash === t ? "market-debt-flash" : ""}`}
              style={{ ["--card-rarity" as string]: preview.color }}
            >
              <div className="flex items-center gap-3">
                <div className="market-card-icon">
                  <ResourceIconSvg kind={iconKind} size={28} />
                  <span className="market-card-emoji text-lg">{meta.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{meta.label}</p>
                  {!compact && <p className="text-[10px] text-muted-foreground line-clamp-2">{meta.desc}</p>}
                  <p className="text-[10px] text-primary mt-1">{count} oggetti compatibili</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-border/30 text-[10px] uppercase tracking-wider">
                <span>Inventario</span>
                <ArrowRight className="h-3 w-3 text-primary" />
                <span>{preview.emoji} {preview.label}</span>
                {busy === t && <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
