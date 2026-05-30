import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, Loader2, Rocket, Shield, Users } from "lucide-react";
import { BIOMES } from "@/data/secretPikminWorld";
import { usePikminSquad } from "@/hooks/useGameData";
import {
  startPhase3Expedition,
  fetchPhase3Expeditions,
  estimateExpeditionReward,
  availablePikminForExpedition,
} from "@/lib/game/expeditions-loop";
import { agentKeyFromSession } from "@/lib/game/planet";
import { getSession } from "@/lib/session";
import { hapticTap } from "@/lib/haptic";
import { EXPEDITION_OBJECTIVES } from "@/types/phase3-db";
import type { BiomeKey, PikminSpecializationKey } from "@/types/secretPikmin";
import type { ExpeditionObjectiveKey, Phase3Expedition } from "@/types/phase3-db";

export function ExpeditionLaunchPanel() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKeyFromSession(session?.role);
  const { squad, reload: reloadSquad } = usePikminSquad(agent);
  const [biome, setBiome] = useState<BiomeKey>("bosco");
  const [objective, setObjective] = useState<ExpeditionObjectiveKey>("raccolta");
  const [selected, setSelected] = useState<string[]>([]);
  const [duration, setDuration] = useState(20);
  const [risk, setRisk] = useState<Phase3Expedition["risk"]>("medio");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Phase3Expedition[]>([]);

  const available = useMemo(() => squad.filter((p) => p.status === "disponibile"), [squad]);

  useEffect(() => {
    fetchPhase3Expeditions(agent).then(setActive);
    const t = setInterval(() => {
      fetchPhase3Expeditions(agent).then((exps) => {
        setActive(exps);
        reloadSquad();
      });
    }, 5000);
    return () => clearInterval(t);
  }, [agent, reloadSquad]);

  const reward = estimateExpeditionReward(biome, objective, selected.length || 1, duration, risk);
  const objDef = EXPEDITION_OBJECTIVES.find((o) => o.key === objective)!;

  const togglePikmin = (id: string) => {
    hapticTap();
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]));
  };

  const launch = async () => {
    if (selected.length === 0) {
      toast.error("Seleziona almeno un Pikmin");
      return;
    }
    setBusy(true);
    try {
      const exp = await startPhase3Expedition({
        agentKey: agent,
        biome,
        objective,
        pikminIds: selected,
        durationMinutes: duration,
        risk,
      });
      toast.success(`Spedizione avviata: ${exp.title}`);
      setSelected([]);
      setActive(await fetchPhase3Expeditions(agent));
      reloadSquad();
    } finally {
      setBusy(false);
    }
  };

  const running = active.filter((e) => e.status === "active");

  return (
    <section className="space-y-4">
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Spedizioni Pikmin</p>
        <h2 className="font-display text-xl text-glow">Lancia una spedizione</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Scegli bioma, obiettivo e squadra. Al rientro: ricompense, XP e progressi missione.
        </p>
      </header>

      {running.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary/80">In corso</p>
          {running.map((e) => {
            const left = Math.max(0, Math.ceil((new Date(e.end_at).getTime() - Date.now()) / 60000));
            return (
              <div key={e.id} className="panel p-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{e.title}</span>
                  <span className="text-primary flex items-center gap-1"><Clock className="h-3 w-3" />{left}m</span>
                </div>
                <p className="text-muted-foreground mt-1">{e.pikmin_ids.length} Pikmin · rischio {e.risk}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="panel p-3 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Bioma</span>
          <select
            value={biome}
            onChange={(e) => setBiome(e.target.value as BiomeKey)}
            className="w-full bg-night/60 border border-border rounded-lg px-2 py-1.5 text-xs"
          >
            {BIOMES.map((b) => (
              <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>
            ))}
          </select>
        </label>
        <label className="panel p-3 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Obiettivo</span>
          <select
            value={objective}
            onChange={(e) => {
              const k = e.target.value as ExpeditionObjectiveKey;
              setObjective(k);
              const def = EXPEDITION_OBJECTIVES.find((o) => o.key === k);
              if (def) setDuration(def.baseDuration);
            }}
            className="w-full bg-night/60 border border-border rounded-lg px-2 py-1.5 text-xs"
          >
            {EXPEDITION_OBJECTIVES.map((o) => (
              <option key={o.key} value={o.key}>{o.emoji} {o.label}</option>
            ))}
          </select>
        </label>
        <label className="panel p-3 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Durata ({duration}m)</span>
          <input type="range" min={10} max={60} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
        </label>
        <label className="panel p-3 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Rischio</span>
          <select value={risk} onChange={(e) => setRisk(e.target.value as Phase3Expedition["risk"])} className="w-full bg-night/60 border border-border rounded-lg px-2 py-1.5 text-xs">
            <option value="basso">Basso</option>
            <option value="medio">Medio</option>
            <option value="alto">Alto</option>
          </select>
        </label>
      </div>

      <div className="panel p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
          <Users className="h-3 w-3" /> Squadra ({selected.length}/5)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {available.map((p) => {
            const on = selected.includes(p.id);
            const bonus = p.specialization && objDef.specBonus.includes(p.specialization as PikminSpecializationKey);
            return (
              <button
                key={p.id}
                onClick={() => togglePikmin(p.id)}
                className={`panel p-2 text-left text-xs transition ${on ? "ring-2 ring-primary bg-primary/10" : ""}`}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-[10px] text-muted-foreground block">Lv{p.level} · {p.specialization}{bonus ? " ★" : ""}</span>
              </button>
            );
          })}
          {available.length === 0 && (
            <p className="col-span-2 text-muted-foreground text-xs">Nessun Pikmin disponibile ({availablePikminForExpedition(agent).length} totali)</p>
          )}
        </div>
      </div>

      <div className="panel p-3 flex items-center justify-between text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Ricompensa stimata</p>
          <p className="text-primary">~{reward.xp} XP · ~{reward.coins} cr · {reward.items} oggetti</p>
        </div>
        <Shield className="h-5 w-5 text-primary/50" />
      </div>

      <button onClick={launch} disabled={busy || selected.length === 0} className="btn-neon w-full py-3 text-xs flex items-center justify-center gap-2 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
        Avvia spedizione
      </button>

      {active.filter((e) => e.status !== "active").slice(0, 3).map((e) => (
        <div key={e.id} className="text-[10px] text-muted-foreground panel p-2">
          {e.status === "completed" ? "✓" : "✗"} {e.title}: {e.summary}
        </div>
      ))}
    </section>
  );
}
