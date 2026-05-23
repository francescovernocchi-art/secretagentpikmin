import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Search, Loader2, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { spendPikmin, getPikminCount } from "@/lib/pikmin";
import type { EnemyRow } from "@/lib/enemies";
import { calculateDistanceMeters, offsetMeters } from "@/lib/geo/distance";
import { scoutingDurationSeconds } from "@/lib/map/radiusRules";

interface Props {
  open: boolean;
  enemy: EnemyRow | null;
  spawnId: string | null;
  enemyPos: { lat: number; lng: number } | null;
  player: { lat: number; lng: number } | null;
  agent: string;
  onClose: () => void;
}

export function ScoutingMissionPanel({
  open,
  enemy,
  spawnId,
  enemyPos,
  player,
  agent,
  onClose,
}: Props) {
  const [count, setCount] = useState(3);
  const [have, setHave] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCount(3);
    getPikminCount().then(setHave).catch(() => setHave(0));
  }, [open]);

  if (!enemy || !enemyPos) return null;

  const dist = player ? calculateDistanceMeters(player.lat, player.lng, enemyPos.lat, enemyPos.lng) : 0;
  const seconds = scoutingDurationSeconds(dist);
  const risk = enemy.danger_level >= 4 ? "alto" : enemy.danger_level >= 2 ? "medio" : "basso";
  const recommended = Math.max(3, enemy.danger_level * 2);

  const start = async () => {
    if (count < 1) return;
    if (count > have) {
      toast.error(`Hai solo ${have} Pikmin disponibili.`);
      return;
    }
    setBusy(true);
    try {
      await spendPikmin(count, "scouting", agent, { target_spawn_id: spawnId });
    } catch (e: any) {
      setBusy(false);
      toast.error("Pikmin insufficienti: " + (e?.message ?? "errore"));
      return;
    }

    const endAt = new Date(Date.now() + seconds * 1000);
    const result = await resolveScout(enemy, count, recommended, enemyPos, agent);
    const { error } = await supabase.from("scouting_missions").insert({
      agent,
      target_spawn_id: spawnId,
      target_lat: enemyPos.lat,
      target_lng: enemyPos.lng,
      pikmin_count: count,
      status: "completed",
      end_at: endAt.toISOString(),
      result,
    });
    setBusy(false);
    if (error) {
      toast.error("Errore spionaggio: " + error.message);
      return;
    }
    toast.success(`Spionaggio completato!`, { description: result.summary, duration: 8000 });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          className="fixed bottom-3 left-3 right-3 z-[900] panel-strong p-4 space-y-3 max-w-md mx-auto"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 flex items-center gap-1">
              <Search className="h-3 w-3" /> Missione di spionaggio
            </p>
            <button onClick={onClose} className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-sm">
            Bersaglio: <b>{enemy.emoji} {enemy.name}</b> a {Math.round(dist)}m
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="panel py-2">
              <p className="text-muted-foreground">Durata</p>
              <p className="font-display text-primary">{seconds}s</p>
            </div>
            <div className="panel py-2">
              <p className="text-muted-foreground">Rischio</p>
              <p className="font-display text-primary capitalize">{risk}</p>
            </div>
            <div className="panel py-2">
              <p className="text-muted-foreground">Consigliati</p>
              <p className="font-display text-primary">{recommended} 🌱</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Pikmin da inviare (hai {have})
            </p>
            <input
              type="number"
              min={1}
              max={Math.max(1, have)}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(have || 99, Number(e.target.value))))}
              className="w-full bg-background/40 border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={start}
            disabled={busy || count < 1 || count > have}
            className="btn-neon w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Invia {count} Pikmin in spionaggio
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

async function resolveScout(
  enemy: EnemyRow,
  sent: number,
  recommended: number,
  enemyPos: { lat: number; lng: number },
  agent: string,
): Promise<Record<string, unknown> & { summary: string }> {
  const efficiency = Math.min(1.5, sent / Math.max(1, recommended));
  const reveals: string[] = [
    `Tipo: ${enemy.name}`,
    `Livello pericolo: ${enemy.danger_level}/5`,
  ];
  if (enemy.weaknesses && (enemy.weaknesses as any).length) {
    reveals.push(`Debolezze: ${(enemy.weaknesses as any).join(", ")}`);
  }
  if (enemy.recommended_pikmin?.length) {
    reveals.push(`Pikmin consigliati: ${enemy.recommended_pikmin.join(", ")}`);
  }

  // 25% * efficiency → scoperta pezzo navicella nelle vicinanze
  let foundShipPart = false;
  if (Math.random() < 0.25 * efficiency) {
    const off = offsetMeters(enemyPos, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80);
    await supabase.from("map_objects").insert({
      agent,
      object_type: "ship_part",
      lat: off.lat,
      lng: off.lng,
      visible: true,
      discovered: true,
      metadata: { discovered_via: "scouting", enemy_id: enemy.id },
    });
    foundShipPart = true;
  }

  const summary = foundShipPart
    ? `I Pikmin hanno trovato tracce sospette vicino al mostro. C'è un pezzo di navicella nelle vicinanze!`
    : `I Pikmin sono tornati con informazioni utili sul ${enemy.name}.`;

  return {
    summary,
    reveals,
    found_ship_part: foundShipPart,
    efficiency,
  };
}
