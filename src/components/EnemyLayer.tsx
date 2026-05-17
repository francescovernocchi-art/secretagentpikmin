import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { addCoins } from "@/lib/coins";
import { WikiImage } from "@/components/WikiImage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  applyPikminLosses,
  getPikminBreakdown,
  rollEnemy,
  simulateBattle,
  PIKMIN_TYPES,
  PIKMIN_TYPE_EMOJI,
  PIKMIN_TYPE_LABEL,
  type BattleSquad,
  type EnemyRow,
  type PikminType,
} from "@/lib/enemies";
import { Skull, Swords, X } from "lucide-react";

type Spawn = {
  id: string;
  enemy_id: string;
  lat: number;
  lng: number;
  radius_m: number;
  active: boolean;
  spawned_at: string;
  expires_at: string | null;
};

type Props = {
  mapRef: MutableRefObject<unknown | null>;
  ready: boolean;
  me: { lat: number; lng: number; acc: number } | null;
};

const SPAWN_INTERVAL_MS = 60_000; // tenta uno spawn ogni 60s
const SPAWN_LIFETIME_MS = 8 * 60_000; // un nemico resta 8 minuti
const AUTO_ATTACK_AFTER_MS = 2 * 60_000; // dopo 2 min senza intervento, attacca

export function EnemyLayer({ mapRef, ready, me }: Props) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.name ?? "lorenzo";

  const [enemies, setEnemies] = useState<EnemyRow[]>([]);
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [active, setActive] = useState<{ spawn: Spawn; enemy: EnemyRow } | null>(null);
  const [breakdown, setBreakdown] = useState<BattleSquad>({});
  const [squad, setSquad] = useState<BattleSquad>({});
  const [resultBox, setResultBox] = useState<string | null>(null);

  const markersRef = useRef<globalThis.Map<string, unknown>>(new globalThis.Map());
  const notifiedRef = useRef<Set<string>>(new Set());
  const autoAttackedRef = useRef<Set<string>>(new Set());

  // load enemies catalog once
  useEffect(() => {
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("enemies").select("*");
      setEnemies((data ?? []) as EnemyRow[]);
    })();
  }, []);

  // load + subscribe spawns
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("map_enemy_spawns")
        .select("*")
        .eq("active", true);
      if (!mounted) return;
      const now = Date.now();
      const live = (data ?? []).filter((s: Spawn) => !s.expires_at || new Date(s.expires_at).getTime() > now);
      setSpawns(live as Spawn[]);
    };
    load();
    const ch = supabase
      .channel("enemy-spawns-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "map_enemy_spawns" }, () => load())
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, []);

  // spawn loop
  useEffect(() => {
    if (!me || enemies.length === 0) return;
    const tryspawn = async () => {
      // limit: max 3 spawn attivi globali
      if (spawns.length >= 3) return;
      const enemy = rollEnemy(enemies);
      if (!enemy) return;
      // posizione casuale entro 30-200m dal giocatore
      const distM = 30 + Math.random() * 170;
      const bearing = Math.random() * Math.PI * 2;
      const dLat = (distM * Math.cos(bearing)) / 111320;
      const dLng = (distM * Math.sin(bearing)) / (111320 * Math.cos((me.lat * Math.PI) / 180));
      const lat = me.lat + dLat;
      const lng = me.lng + dLng;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: created } = await (supabase as any)
        .from("map_enemy_spawns")
        .insert({
          enemy_id: enemy.id,
          lat,
          lng,
          radius_m: 25,
          active: true,
          expires_at: new Date(Date.now() + SPAWN_LIFETIME_MS).toISOString(),
        })
        .select()
        .single();
      if (created) {
        toast.warning(`⚠️ Attenzione! Un ${enemy.name} si aggira nella zona.`, { duration: 5000 });
        try { navigator.vibrate?.(120); } catch {}
      }
    };
    // first attempt after 15s to give the map time to settle
    const first = setTimeout(tryspawn, 15_000);
    const id = setInterval(tryspawn, SPAWN_INTERVAL_MS);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [me, enemies, spawns.length]);

  // notify on new spawns + auto-attack if ignored
  useEffect(() => {
    for (const s of spawns) {
      if (!notifiedRef.current.has(s.id)) {
        notifiedRef.current.add(s.id);
        const enemy = enemies.find((e) => e.id === s.enemy_id);
        if (enemy) {
          // notification handled at spawn creation; nothing extra needed here
        }
      }
    }
    // auto-attack
    const t = setInterval(() => {
      const now = Date.now();
      for (const s of spawns) {
        if (autoAttackedRef.current.has(s.id)) continue;
        if (now - new Date(s.spawned_at).getTime() < AUTO_ATTACK_AFTER_MS) continue;
        const enemy = enemies.find((e) => e.id === s.enemy_id);
        if (!enemy) continue;
        autoAttackedRef.current.add(s.id);
        runAutoAttack(s, enemy);
      }
    }, 20_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spawns, enemies]);

  const runAutoAttack = async (s: Spawn, enemy: EnemyRow) => {
    const bk = await getPikminBreakdown();
    const total = Object.values(bk).reduce((a, b) => a + (b ?? 0), 0);
    if (total === 0) return;
    // sceglie qualche pikmin a caso
    const losses: BattleSquad = {};
    let toEat = Math.min(total, enemy.pikmin_eat_min);
    const order = (Object.keys(bk) as PikminType[]).filter((t) => (bk[t] ?? 0) > 0);
    for (const t of order) {
      if (toEat <= 0) break;
      const take = Math.min(bk[t] ?? 0, toEat);
      losses[t] = take;
      toEat -= take;
    }
    await applyPikminLosses(losses, agent);
    const lostText = Object.entries(losses)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([t, n]) => `${n} ${PIKMIN_TYPE_LABEL[t as PikminType]}`)
      .join(", ");
    const summary = `${enemy.name} ha attaccato di sorpresa e mangiato ${lostText || "alcuni Pikmin"}.`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("battle_logs").insert({
      enemy_id: enemy.id,
      enemy_name: enemy.name,
      agent,
      result: "sconfitta",
      pikmin_sent: {},
      pikmin_lost: losses,
      rewards: {},
      summary,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("map_enemy_spawns")
      .update({ active: false, defeated_by: enemy.name, defeated_at: new Date().toISOString() })
      .eq("id", s.id);
    toast.error(summary, { duration: 6000 });
  };

  // render markers
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!map) return;
      const seen = new Set<string>();
      for (const s of spawns) {
        seen.add(s.id);
        const enemy = enemies.find((e) => e.id === s.enemy_id);
        if (!enemy) continue;
        const existing = markersRef.current.get(s.id);
        if (existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (existing as any).setLatLng([s.lat, s.lng]);
        } else {
          const html = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;transform:translateY(-6px)">
            <div style="background:#0a0a0a;color:#ff7a7a;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap;border:1px solid #ff5e5e;box-shadow:0 0 8px #ff5e5e">⚠️ ${enemy.name}</div>
            <div style="font-size:30px;line-height:1;filter:drop-shadow(0 0 8px #ff5e5e)">${enemy.emoji}</div>
          </div>`;
          const icon = L.divIcon({ className: "", html, iconSize: [120, 44], iconAnchor: [60, 28] });
          const marker = L.marker([s.lat, s.lng], { icon, zIndexOffset: 950 }).addTo(map);
          marker.on("click", async () => {
            const bk = await getPikminBreakdown();
            setBreakdown(bk);
            setSquad({});
            setActive({ spawn: s, enemy });
          });
          markersRef.current.set(s.id, marker);
        }
      }
      // remove stale
      for (const [id, m] of markersRef.current.entries()) {
        if (!seen.has(id)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.removeLayer(m as any);
          markersRef.current.delete(id);
        }
      }
    })();
  }, [ready, spawns, enemies, mapRef]);

  const totalSquad = Object.values(squad).reduce((a, b) => a + (b ?? 0), 0);

  const fight = async () => {
    if (!active || totalSquad === 0) return;
    const { enemy, spawn } = active;
    const res = simulateBattle(enemy, squad);
    await applyPikminLosses(res.pikminLost, agent);
    if (res.outcome === "vittoria" && res.rewards.coins > 0) {
      try { await addCoins(agent, res.rewards.coins, "battle_reward", { enemy: enemy.name }); } catch {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("battle_logs").insert({
      enemy_id: enemy.id,
      enemy_name: enemy.name,
      agent,
      result: res.outcome,
      pikmin_sent: squad,
      pikmin_lost: res.pikminLost,
      rewards: res.rewards,
      summary: res.summary,
    });
    if (res.outcome === "vittoria") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("map_enemy_spawns")
        .update({ active: false, defeated_by: agent, defeated_at: new Date().toISOString() })
        .eq("id", spawn.id);
    }
    setResultBox(res.summary);
    setActive(null);
    setSquad({});
  };

  const flee = async () => {
    if (!active) return;
    toast.message(`Hai ritirato la squadra. ${active.enemy.name} resta nella zona.`);
    setActive(null);
  };

  return (
    <>
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-glow flex items-center gap-2">
                  <Swords className="h-5 w-5 text-destructive" /> Battaglia: {active.enemy.name}
                </DialogTitle>
                <DialogDescription>
                  Pericolosità {active.enemy.danger_level}/5 · HP {active.enemy.hp} · Danno {active.enemy.damage}
                </DialogDescription>
              </DialogHeader>

              <WikiImage src={active.enemy.image_url} alt={active.enemy.name} fallback={active.enemy.emoji} className="w-full h-36 p-3" />

              <div className="text-xs text-muted-foreground">
                Pikmin consigliati:{" "}
                {(active.enemy.recommended_pikmin ?? []).map((t) => (
                  <span key={t} className="mr-1">
                    {PIKMIN_TYPE_EMOJI[t as PikminType]} {PIKMIN_TYPE_LABEL[t as PikminType]}
                  </span>
                ))}
              </div>

              <div className="space-y-2 mt-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Scegli la squadra</p>
                <div className="grid grid-cols-3 gap-2">
                  {PIKMIN_TYPES.map((t) => {
                    const max = breakdown[t] ?? 0;
                    if (max <= 0) return null;
                    const v = squad[t] ?? 0;
                    return (
                      <div key={t} className="panel p-2">
                        <p className="text-[10px] flex items-center gap-1">
                          <span>{PIKMIN_TYPE_EMOJI[t]}</span>
                          <span>{PIKMIN_TYPE_LABEL[t]}</span>
                          <span className="ml-auto text-muted-foreground">/{max}</span>
                        </p>
                        <input
                          type="number"
                          min={0}
                          max={max}
                          value={v}
                          onChange={(e) =>
                            setSquad({ ...squad, [t]: Math.max(0, Math.min(max, Number(e.target.value))) })
                          }
                          className="mt-1 w-full rounded bg-night/60 border border-border px-2 py-1 text-xs outline-none focus:border-primary"
                        />
                      </div>
                    );
                  })}
                  {Object.values(breakdown).every((n) => !n) && (
                    <p className="col-span-3 text-xs text-muted-foreground text-center py-3">
                      Nessun Pikmin disponibile. Cattura Pikmin dal Radar o creane in Lab.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button onClick={flee} className="flex-1 panel py-2 text-xs flex items-center justify-center gap-1">
                  <X className="h-3 w-3" /> Ritirata
                </button>
                <button
                  onClick={fight}
                  disabled={totalSquad === 0}
                  className="flex-1 btn-neon py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Swords className="h-3 w-3" /> Attacca ({totalSquad})
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resultBox} onOpenChange={(o) => !o && setResultBox(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-glow flex items-center gap-2">
              <Skull className="h-5 w-5 text-destructive" /> Riepilogo battaglia
            </DialogTitle>
          </DialogHeader>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-foreground/90 mt-2"
          >
            {resultBox}
          </motion.p>
          <button onClick={() => setResultBox(null)} className="btn-neon w-full py-2 text-xs mt-3">
            Chiudi
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
