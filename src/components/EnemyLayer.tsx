import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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
import { Skull, Swords, X, Eye, EyeOff, Footprints, Radar as RadarIcon } from "lucide-react";
import { getDayPhase, isActiveNow, PHASE_EMOJI, PHASE_LABEL, PHASE_COLOR, type DayPhase } from "@/lib/daycycle";

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

const SPAWN_INTERVAL_MS = 60_000;
// I nemici restano sulla mappa finché non vengono uccisi: nessuna scadenza.
const AUTO_ATTACK_AFTER_MS = 2 * 60_000;

const MOVE_TICK_MS = 1800;
const PATROL_RADIUS_M = 80;
const DETECTION_RADIUS_M = 25;
// const ATTACK_RADIUS_M = 10;
const HIDE_DURATION_MS = 30_000;
const FLEE_COOLDOWN_MS = 60_000;

type LivePos = {
  lat: number;
  lng: number;
  homeLat: number;
  homeLng: number;
  heading: number; // radians
  behavior: "pattuglia" | "aggressivo" | "guardiano" | "timido";
  detectionM: number;
};

function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pickBehavior(enemy: EnemyRow): LivePos["behavior"] {
  const b = (enemy.behavior ?? "").toLowerCase();
  if (b.includes("aggress")) return "aggressivo";
  if (b.includes("guard") || b.includes("statico")) return "guardiano";
  if (b.includes("timid") || b.includes("fugg") || b.includes("paur")) return "timido";
  if (enemy.danger_level >= 4) return "aggressivo";
  if (enemy.danger_level <= 1) return "timido";
  return "pattuglia";
}

export function EnemyLayer({ mapRef, ready, me }: Props) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.name ?? "lorenzo";
  const isAdmin = session?.role === "papa";

  const [enemies, setEnemies] = useState<EnemyRow[]>([]);
  const [spawns, setSpawns] = useState<Spawn[]>([]);
  const [active, setActive] = useState<{ spawn: Spawn; enemy: EnemyRow } | null>(null);
  const [proximity, setProximity] = useState<{ spawn: Spawn; enemy: EnemyRow; dist: number } | null>(null);
  const [card, setCard] = useState<{ spawn: Spawn; enemy: EnemyRow } | null>(null);
  const [scanned, setScanned] = useState<Set<string>>(new Set());
  const [breakdown, setBreakdown] = useState<BattleSquad>({});
  const [squad, setSquad] = useState<BattleSquad>({});
  const [resultBox, setResultBox] = useState<string | null>(null);
  const [, setTick] = useState(0); // re-render on movement
  const [hiddenUntil, setHiddenUntil] = useState<number>(0);
  const [placeEnemyOpen, setPlaceEnemyOpen] = useState(false);
  const [placeEnemyMode, setPlaceEnemyMode] = useState<EnemyRow | null>(null);

  const markersRef = useRef<globalThis.Map<string, unknown>>(new globalThis.Map());
  const detectionCirclesRef = useRef<globalThis.Map<string, unknown>>(new globalThis.Map());
  const notifiedRef = useRef<Set<string>>(new Set());
  const autoAttackedRef = useRef<Set<string>>(new Set());
  const livePosRef = useRef<globalThis.Map<string, LivePos>>(new globalThis.Map());
  const proximityDismissedRef = useRef<globalThis.Map<string, number>>(new globalThis.Map());
  const detectedRef = useRef<Set<string>>(new Set());

  const isHidden = useMemo(() => hiddenUntil > Date.now(), [hiddenUntil]);

  // load enemies catalog
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

  // Admin place mode: handle map clicks to spawn the selected enemy
  useEffect(() => {
    if (!ready || !placeEnemyMode) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = mapRef.current as any;
    if (!map) return;
    const onClick = async (e: { latlng: { lat: number; lng: number } }) => {
      const enemy = placeEnemyMode;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("map_enemy_spawns").insert({
        enemy_id: enemy.id,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        radius_m: PATROL_RADIUS_M,
        active: true,
        expires_at: new Date(Date.now() + SPAWN_LIFETIME_MS).toISOString(),
      });
      if (error) {
        toast.error("Spawn fallito: " + error.message);
      } else {
        toast.success(`${enemy.emoji} ${enemy.name} piazzato sulla mappa`);
        try { navigator.vibrate?.(50); } catch { /* ignore */ }
      }
      setPlaceEnemyMode(null);
    };
    map.on("click", onClick);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const container = (map as any).getContainer?.();
    if (container) container.style.cursor = "crosshair";
    return () => {
      map.off("click", onClick);
      if (container) container.style.cursor = "";
    };
  }, [placeEnemyMode, ready, mapRef]);



  // init live positions when spawns arrive
  useEffect(() => {
    for (const s of spawns) {
      if (!livePosRef.current.has(s.id)) {
        const enemy = enemies.find((e) => e.id === s.enemy_id);
        livePosRef.current.set(s.id, {
          lat: s.lat,
          lng: s.lng,
          homeLat: s.lat,
          homeLng: s.lng,
          heading: Math.random() * Math.PI * 2,
          behavior: enemy ? pickBehavior(enemy) : "pattuglia",
          detectionM: DETECTION_RADIUS_M + (enemy ? enemy.danger_level * 4 : 0),
        });
      }
    }
    // cleanup positions for despawned
    for (const id of Array.from(livePosRef.current.keys())) {
      if (!spawns.find((s) => s.id === id)) livePosRef.current.delete(id);
    }
  }, [spawns, enemies]);

  // spawn loop
  useEffect(() => {
    if (!me || enemies.length === 0) return;
    const tryspawn = async () => {
      if (spawns.length >= 5) return;
      const enemy = rollEnemy(enemies);
      if (!enemy) return;
      // Spawn entro il comune: 200m - 10km dal giocatore
      const distM = 200 + Math.random() * 9800;
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
          radius_m: PATROL_RADIUS_M,
          active: true,
          expires_at: new Date(Date.now() + SPAWN_LIFETIME_MS).toISOString(),
        })
        .select()
        .single();
      if (created) {
        toast.warning(`⚠️ Un ${enemy.name} si aggira nella zona.`, { duration: 4500 });
        try { navigator.vibrate?.(120); } catch { /* ignore */ }
      }
    };
    const first = setTimeout(tryspawn, 15_000);
    const id = setInterval(tryspawn, SPAWN_INTERVAL_MS);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [me, enemies, spawns.length]);

  // movement + detection tick
  useEffect(() => {
    const tick = () => {
      // move each enemy
      for (const s of spawns) {
        const pos = livePosRef.current.get(s.id);
        if (!pos) continue;
        const enemy = enemies.find((e) => e.id === s.enemy_id);
        if (!enemy) continue;

        // base step distance (m) depending on behavior + danger
        const baseStep = 2 + enemy.danger_level * 0.8;
        let stepM = baseStep * (0.4 + Math.random() * 0.9);

        // direction logic
        let heading = pos.heading + (Math.random() - 0.5) * 0.9;
        const playerDist = me ? distMeters(pos, me) : Infinity;
        const playerVisible = me && !isHidden;

        if (playerVisible && playerDist < pos.detectionM * 1.5) {
          const bearingToPlayer = Math.atan2(me!.lng - pos.lng, me!.lat - pos.lat);
          if (pos.behavior === "aggressivo") {
            heading = bearingToPlayer;
            stepM *= 1.4;
          } else if (pos.behavior === "timido") {
            heading = bearingToPlayer + Math.PI;
            stepM *= 1.6;
          }
        }
        if (pos.behavior === "guardiano") stepM *= 0.4;

        const dLat = (stepM * Math.cos(heading)) / 111320;
        const dLng = (stepM * Math.sin(heading)) / (111320 * Math.cos((pos.lat * Math.PI) / 180));
        let nextLat = pos.lat + dLat;
        let nextLng = pos.lng + dLng;

        // clamp to patrol area around home
        const fromHome = distMeters({ lat: nextLat, lng: nextLng }, { lat: pos.homeLat, lng: pos.homeLng });
        const maxRadius = pos.behavior === "guardiano" ? 25 : PATROL_RADIUS_M;
        if (fromHome > maxRadius) {
          // turn back toward home
          heading = Math.atan2(pos.homeLng - pos.lng, pos.homeLat - pos.lat);
          const back = (stepM * Math.cos(heading)) / 111320;
          const back2 = (stepM * Math.sin(heading)) / (111320 * Math.cos((pos.lat * Math.PI) / 180));
          nextLat = pos.lat + back;
          nextLng = pos.lng + back2;
        }

        pos.lat = nextLat;
        pos.lng = nextLng;
        pos.heading = heading;
      }

      // detection
      if (me && !isHidden && !active && !proximity) {
        for (const s of spawns) {
          const pos = livePosRef.current.get(s.id);
          const enemy = enemies.find((e) => e.id === s.enemy_id);
          if (!pos || !enemy) continue;
          const d = distMeters(pos, me);
          const dismissed = proximityDismissedRef.current.get(s.id) ?? 0;
          if (d <= pos.detectionM && Date.now() > dismissed) {
            if (!detectedRef.current.has(s.id)) {
              detectedRef.current.add(s.id);
              try { navigator.vibrate?.([60, 40, 100]); } catch { /* ignore */ }
              toast.error(`⚠️ NEMICO VICINO · ${enemy.name} (${Math.round(d)}m)`, { duration: 4000 });
            }
            setProximity({ spawn: s, enemy, dist: d });
            break;
          } else if (d > pos.detectionM * 1.5) {
            detectedRef.current.delete(s.id);
          }
        }
      }

      setTick((t) => (t + 1) & 0xffff);
    };
    const id = setInterval(tick, MOVE_TICK_MS);
    return () => clearInterval(id);
  }, [spawns, enemies, me, isHidden, active, proximity]);

  // auto-attack
  useEffect(() => {
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

  // render markers + detection circles
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
        const pos = livePosRef.current.get(s.id) ?? { lat: s.lat, lng: s.lng };
        const nearby = me ? distMeters(pos, me) <= (livePosRef.current.get(s.id)?.detectionM ?? DETECTION_RADIUS_M) : false;
        const color = nearby ? "#ff3030" : "#ff7a7a";

        const existing = markersRef.current.get(s.id);
        if (existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (existing as any).setLatLng([pos.lat, pos.lng]);
          // update label color if needed
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const el = (existing as any).getElement?.();
          if (el) {
            const badge = el.querySelector("[data-enemy-badge]");
            if (badge) {
              (badge as HTMLElement).style.color = color;
              (badge as HTMLElement).style.borderColor = color;
              (badge as HTMLElement).style.boxShadow = `0 0 8px ${color}`;
            }
            const ico = el.querySelector("[data-enemy-ico]");
            if (ico) (ico as HTMLElement).style.filter = `drop-shadow(0 0 8px ${color})`;
          }
        } else {
          const iconHtml = enemy.image_url
            ? `<img src="${enemy.image_url}" alt="" style="width:36px;height:36px;object-fit:contain;filter:drop-shadow(0 0 8px ${color})" onerror="this.outerHTML='<div style=&quot;font-size:30px;line-height:1;filter:drop-shadow(0 0 8px ${color})&quot;>${enemy.emoji}</div>'" />`
            : `<div style="font-size:30px;line-height:1;filter:drop-shadow(0 0 8px ${color})">${enemy.emoji}</div>`;
          const html = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;transform:translateY(-6px)">
            <div data-enemy-badge style="background:#0a0a0a;color:${color};font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;white-space:nowrap;border:1px solid ${color};box-shadow:0 0 8px ${color}">⚠️ ${enemy.name}</div>
            <div data-enemy-ico>${iconHtml}</div>
          </div>`;
          const icon = L.divIcon({ className: "", html, iconSize: [120, 56], iconAnchor: [60, 32] });
          const marker = L.marker([pos.lat, pos.lng], { icon, zIndexOffset: 950 }).addTo(map);
          marker.on("click", () => {
            setCard({ spawn: s, enemy });
          });
          markersRef.current.set(s.id, marker);

          // detection circle
          const live = livePosRef.current.get(s.id);
          const circle = L.circle([pos.lat, pos.lng], {
            radius: live?.detectionM ?? DETECTION_RADIUS_M,
            color: "#ff3030",
            weight: 1,
            opacity: 0.35,
            fillOpacity: 0.05,
            dashArray: "3 6",
          }).addTo(map);
          detectionCirclesRef.current.set(s.id, circle);
        }
        // move detection circle
        const circle = detectionCirclesRef.current.get(s.id);
        if (circle) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (circle as any).setLatLng([pos.lat, pos.lng]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (circle as any).setStyle({ opacity: nearby ? 0.7 : 0.35, color: nearby ? "#ff2020" : "#ff7a7a" });
        }
      }
      for (const [id, m] of markersRef.current.entries()) {
        if (!seen.has(id)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          map.removeLayer(m as any);
          markersRef.current.delete(id);
          const c = detectionCirclesRef.current.get(id);
          if (c) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.removeLayer(c as any);
            detectionCirclesRef.current.delete(id);
          }
        }
      }
    })();
    // re-run on every tick via setTick
  });

  const totalSquad = Object.values(squad).reduce((a, b) => a + (b ?? 0), 0);

  const openBattleFromProximity = async () => {
    if (!proximity) return;
    const bk = await getPikminBreakdown();
    setBreakdown(bk);
    setSquad({});
    setActive({ spawn: proximity.spawn, enemy: proximity.enemy });
    setProximity(null);
  };

  const flee = () => {
    if (!proximity) return;
    proximityDismissedRef.current.set(proximity.spawn.id, Date.now() + FLEE_COOLDOWN_MS);
    toast.message(`Sei scappato da ${proximity.enemy.name}.`);
    try { navigator.vibrate?.(20); } catch { /* ignore */ }
    setProximity(null);
  };

  const hide = () => {
    if (!proximity) return;
    setHiddenUntil(Date.now() + HIDE_DURATION_MS);
    proximityDismissedRef.current.set(proximity.spawn.id, Date.now() + HIDE_DURATION_MS);
    toast.message(`Sei nascosto per ${HIDE_DURATION_MS / 1000}s.`);
    setProximity(null);
  };

  const observe = () => {
    // keep proximity open but mark as observed (don't reopen for 30s)
    if (!proximity) return;
    proximityDismissedRef.current.set(proximity.spawn.id, Date.now() + 30_000);
  };

  const fight = async () => {
    if (!active || totalSquad === 0) return;
    const { enemy, spawn } = active;
    const res = simulateBattle(enemy, squad);
    await applyPikminLosses(res.pikminLost, agent);
    if (res.outcome === "vittoria" && res.rewards.coins > 0) {
      try { await addCoins(agent, res.rewards.coins, "battle_reward", { enemy: enemy.name }); } catch { /* ignore */ }
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

  const closeBattle = () => {
    setActive(null);
  };

  return (
    <>
      {/* Hidden indicator */}
      {isHidden && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1100] panel px-3 py-1 text-[10px] uppercase tracking-widest flex items-center gap-1 text-emerald-300 border-emerald-500/50">
          <EyeOff className="h-3 w-3" /> Nascosto
        </div>
      )}

      {/* Admin: piazza nemico */}
      {isAdmin && (
        <>
          <button
            onClick={() => setPlaceEnemyOpen(true)}
            className="fixed top-32 right-3 z-[1100] panel-strong px-3 py-2 text-xs flex items-center gap-1.5 text-destructive border-destructive/40"
          >
            <Skull className="h-3.5 w-3.5" /> Piazza nemico
          </button>
          {placeEnemyMode && (
            <div className="fixed top-44 right-3 z-[1100] panel px-3 py-1.5 text-[10px] uppercase tracking-widest text-destructive border-destructive/40">
              Tocca la mappa · {placeEnemyMode.emoji} {placeEnemyMode.name}
              <button onClick={() => setPlaceEnemyMode(null)} className="ml-2 text-muted-foreground">✕</button>
            </div>
          )}
        </>
      )}

      {/* Picker nemico per admin */}
      <Dialog open={placeEnemyOpen} onOpenChange={setPlaceEnemyOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-glow flex items-center gap-2">
              <Skull className="h-5 w-5 text-destructive" /> Scegli il nemico
            </DialogTitle>
            <DialogDescription>Poi tocca la mappa nel punto in cui vuoi farlo apparire.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {enemies.map((e) => (
              <button
                key={e.id}
                onClick={() => { setPlaceEnemyMode(e); setPlaceEnemyOpen(false); }}
                className="panel p-2 text-left flex items-center gap-2 active:scale-[0.98]"
              >
                <span className="text-2xl">{e.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-display text-glow truncate">{e.name}</p>
                  <p className="text-[10px] text-muted-foreground">Pericolosità {e.danger_level}/5</p>
                </div>
              </button>
            ))}
            {enemies.length === 0 && (
              <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Nessun nemico nel bestiario.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>



      {/* Enemy card (click marker) */}
      <Dialog open={!!card} onOpenChange={(o) => !o && setCard(null)}>
        <DialogContent className="max-w-sm">
          {card && (() => {
            const isScanned = scanned.has(card.spawn.id);
            const live = livePosRef.current.get(card.spawn.id);
            const dist = me ? Math.round(distMeters({ lat: live?.lat ?? card.spawn.lat, lng: live?.lng ?? card.spawn.lng }, me)) : null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-lg text-glow flex items-center gap-2">
                    <span className="text-2xl">{card.enemy.emoji}</span> {card.enemy.name}
                  </DialogTitle>
                  <DialogDescription>
                    {card.enemy.habitat ?? "Avvistato sulla mappa"}{dist !== null ? ` · ${dist}m da te` : ""}
                  </DialogDescription>
                </DialogHeader>
                <WikiImage src={card.enemy.image_url} alt={card.enemy.name} fallback={card.enemy.emoji} className="w-full h-32 p-2" />
                {card.enemy.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{card.enemy.description}</p>
                )}
                {isScanned ? (
                  <div className="panel p-2 space-y-1 text-[11px]">
                    <p className="flex items-center gap-1 text-primary"><RadarIcon className="h-3 w-3" /> SCAN COMPLETATO</p>
                    <p>Pericolosità: <b className="text-destructive">{card.enemy.danger_level}/5</b> · HP {card.enemy.hp} · Danno {card.enemy.damage}</p>
                    <p>Comportamento: {live?.behavior ?? card.enemy.behavior ?? "?"}</p>
                    <p>Pikmin consigliati: {(card.enemy.recommended_pikmin ?? []).length === 0 ? "—" : (card.enemy.recommended_pikmin ?? []).map((t) => (
                      <span key={t} className="mr-1">{PIKMIN_TYPE_EMOJI[t as PikminType]} {PIKMIN_TYPE_LABEL[t as PikminType]}</span>
                    ))}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground italic">Dati sconosciuti. Esegui uno scan per rivelare pericolosità e Pikmin consigliati.</p>
                )}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button
                    onClick={() => {
                      setScanned((s) => new Set(s).add(card.spawn.id));
                      try { navigator.vibrate?.(40); } catch { /* ignore */ }
                      toast.success(`Scan: ${card.enemy.name} pericolosità ${card.enemy.danger_level}/5`);
                    }}
                    className="panel py-2 text-xs flex items-center justify-center gap-1"
                  >
                    <RadarIcon className="h-3 w-3" /> Scan
                  </button>
                  <button
                    onClick={async () => {
                      const bk = await getPikminBreakdown();
                      setBreakdown(bk);
                      setSquad({});
                      setActive({ spawn: card.spawn, enemy: card.enemy });
                      setCard(null);
                    }}
                    className="btn-neon py-2 text-xs flex items-center justify-center gap-1"
                  >
                    <Swords className="h-3 w-3" /> Battaglia
                  </button>
                  <button
                    onClick={() => {
                      setHiddenUntil(Date.now() + HIDE_DURATION_MS);
                      proximityDismissedRef.current.set(card.spawn.id, Date.now() + HIDE_DURATION_MS);
                      try { navigator.vibrate?.(20); } catch { /* ignore */ }
                      toast.message(`Sei nascosto per ${HIDE_DURATION_MS / 1000}s. ${card.enemy.name} non ti vede.`);
                      setCard(null);
                    }}
                    className="panel py-2 text-xs flex items-center justify-center gap-1"
                  >
                    <EyeOff className="h-3 w-3" /> Nasconditi
                  </button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>


      <Dialog open={!!proximity} onOpenChange={(o) => !o && setProximity(null)}>
        <DialogContent className="max-w-sm">
          {proximity && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg text-glow flex items-center gap-2 text-destructive">
                  <RadarIcon className="h-5 w-5 animate-pulse" /> NEMICO VICINO
                </DialogTitle>
                <DialogDescription>
                  {proximity.enemy.emoji} <b>{proximity.enemy.name}</b> · {Math.round(proximity.dist)}m · pericolosità {proximity.enemy.danger_level}/5
                </DialogDescription>
              </DialogHeader>
              <div className="text-[11px] text-muted-foreground -mt-1">
                HP {proximity.enemy.hp} · Danno {proximity.enemy.damage} · Comp.: {livePosRef.current.get(proximity.spawn.id)?.behavior ?? "?"}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={openBattleFromProximity} className="btn-neon py-2 text-xs flex items-center justify-center gap-1">
                  <Swords className="h-3 w-3" /> Ingaggia
                </button>
                <button onClick={hide} className="panel py-2 text-xs flex items-center justify-center gap-1">
                  <EyeOff className="h-3 w-3" /> Nasconditi
                </button>
                <button onClick={flee} className="panel py-2 text-xs flex items-center justify-center gap-1">
                  <Footprints className="h-3 w-3" /> Fuggi
                </button>
                <button onClick={observe} className="panel py-2 text-xs flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" /> Osserva
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!active} onOpenChange={(o) => !o && closeBattle()}>
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
                <button onClick={closeBattle} className="flex-1 panel py-2 text-xs flex items-center justify-center gap-1">
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
