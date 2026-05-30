import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Plus, Loader2 } from "lucide-react";
import { BIOMES } from "@/data/secretPikminWorld";
import {
  fetchAgentVillages,
  fetchActiveVillage,
  setActiveVillage,
  createVillage,
  fetchPrimaryVillage,
} from "@/lib/game/villages";
import { fetchPlayerLocation } from "@/lib/game/player-location";
import { agentKeyFromSession, displayAgentName } from "@/lib/game/planet";
import { getSession } from "@/lib/session";
import { hapticTap } from "@/lib/haptic";
import type { DbVillageExtended } from "@/types/phase4-db";
import type { BiomeKey } from "@/types/secretPikmin";

export function VillageNetworkPanel({ compact = false }: { compact?: boolean }) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKeyFromSession(session?.role);
  const [villages, setVillages] = useState<DbVillageExtended[]>([]);
  const [active, setActive] = useState<DbVillageExtended | null>(null);
  const [maxV, setMaxV] = useState(1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [biome, setBiome] = useState<BiomeKey>("bosco");
  const [showForm, setShowForm] = useState(false);

  const reload = async () => {
    const [{ villages: v }, activeV, primary] = await Promise.all([
      fetchAgentVillages(agent),
      fetchActiveVillage(agent),
      fetchPrimaryVillage(agent),
    ]);
    setVillages(v);
    setActive(activeV);
    setMaxV(primary.maxVillages);
  };

  useEffect(() => { reload(); }, [agent]);

  const activate = async (id: string) => {
    hapticTap();
    await setActiveVillage(agent, id);
    await reload();
    toast.success("Villaggio attivo aggiornato");
  };

  const create = async () => {
    if (!name.trim()) { toast.error("Inserisci un nome"); return; }
    setBusy(true);
    try {
      const loc = await fetchPlayerLocation(agent);
      const result = await createVillage({
        agentKey: agent,
        name: name.trim(),
        biomeKey: biome,
        lat: loc.lat,
        lng: loc.lng,
      });
      if (result.success) {
        toast.success(result.message);
        setShowForm(false);
        setName("");
        await reload();
      } else toast.error(result.message);
    } finally { setBusy(false); }
  };

  return (
    <section className="space-y-3">
      {!compact && (
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Rete Villaggi</p>
          <h2 className="font-display text-xl text-glow">Colonie di {displayAgentName(agent)}</h2>
          <p className="text-xs text-muted-foreground">{villages.length}/{maxV} villaggi · CC regola il limite</p>
        </header>
      )}

      <div className="space-y-2">
        {villages.map((v) => (
          <button
            key={v.id}
            onClick={() => activate(v.id)}
            className={`w-full panel p-3 text-left text-xs transition ${active?.id === v.id ? "ring-1 ring-primary bg-primary/5" : ""}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">{v.name} {v.is_primary && "⭐"}</span>
              <span className="text-primary">{BIOMES.find((b) => b.key === v.biome_key)?.emoji}</span>
            </div>
            <p className="text-muted-foreground mt-1">
              {v.biome_key} · raggio {v.action_radius_m}m
              {v.lat != null && ` · ${v.lat.toFixed(4)}, ${v.lng?.toFixed(4)}`}
            </p>
            {active?.id === v.id && <p className="text-[10px] text-primary mt-1">● Villaggio attivo</p>}
          </button>
        ))}
      </div>

      {villages.length < maxV && (
        showForm ? (
          <div className="panel p-3 space-y-2 text-xs">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome villaggio" className="w-full rounded-lg bg-night/60 border border-border px-2 py-1.5" />
            <select value={biome} onChange={(e) => setBiome(e.target.value as BiomeKey)} className="w-full rounded-lg bg-night/60 border border-border px-2 py-1.5">
              {BIOMES.map((b) => <option key={b.key} value={b.key}>{b.emoji} {b.label}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={create} disabled={busy} className="btn-neon flex-1 py-2 flex items-center justify-center gap-1">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />} Crea
              </button>
              <button onClick={() => setShowForm(false)} className="panel flex-1 py-2">Annulla</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn-neon w-full py-2 text-xs flex items-center justify-center gap-1">
            <Plus className="h-3 w-3" /> Nuovo villaggio ({villages.length}/{maxV})
          </button>
        )
      )}
    </section>
  );
}
