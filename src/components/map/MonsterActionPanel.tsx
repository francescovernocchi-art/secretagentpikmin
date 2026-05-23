import { motion, AnimatePresence } from "framer-motion";
import { Swords, Search, X } from "lucide-react";
import type { EnemyRow } from "@/lib/enemies";
import { calculateDistanceMeters } from "@/lib/geo/distance";
import { PLAYER_ATTACK_RADIUS } from "@/lib/map/radiusRules";

interface Props {
  open: boolean;
  enemy: EnemyRow | null;
  spawnId: string | null;
  enemyPos: { lat: number; lng: number } | null;
  player: { lat: number; lng: number } | null;
  onClose: () => void;
  onAttack: () => void;
  onScout: () => void;
}

/** Pannello azione: se il mostro è entro 200m mostra "Attacca", altrimenti "Spionaggio". */
export function MonsterActionPanel({
  open,
  enemy,
  spawnId,
  enemyPos,
  player,
  onClose,
  onAttack,
  onScout,
}: Props) {
  const dist = player && enemyPos
    ? calculateDistanceMeters(player.lat, player.lng, enemyPos.lat, enemyPos.lng)
    : null;
  const inAttackRange = dist != null && dist <= PLAYER_ATTACK_RADIUS;

  return (
    <AnimatePresence>
      {open && enemy && spawnId && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="fixed bottom-3 left-3 right-3 z-[800] panel-strong p-4 space-y-3 max-w-md mx-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl">{enemy.emoji}</span>
              <div className="min-w-0">
                <p className="font-display text-base text-glow truncate">{enemy.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Pericolosità {enemy.danger_level}/5 ·{" "}
                  {dist != null ? `${Math.round(dist)}m da te` : "distanza ignota"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          {inAttackRange ? (
            <>
              <p className="text-xs text-primary">Mostro entro il raggio d'azione.</p>
              <button
                onClick={onAttack}
                className="btn-neon w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Swords className="h-4 w-4" /> Attacca
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-amber-400">
                Fuori raggio · attaccare richiede meno di {PLAYER_ATTACK_RADIUS}m. Manda i Pikmin in
                spionaggio per raccogliere informazioni.
              </p>
              <button
                onClick={onScout}
                className="btn-neon w-full py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Search className="h-4 w-4" /> Invia Pikmin in spionaggio
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
