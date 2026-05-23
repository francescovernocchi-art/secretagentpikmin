import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Coins, Zap, AlertTriangle, Sparkles, RefreshCw, Database } from "lucide-react";
import { hapticTap } from "@/lib/haptic";

interface BaseLite { agent: string; name: string; level: number; faction: string | null; }
interface AgentLite { agent: string; coins: number; }

/**
 * Modalità Dio: solo per il Comandante.
 * Permette di modificare valori chiave senza dover toccare il database.
 */
export function AdminGodPanel() {
  const [bases, setBases] = useState<BaseLite[]>([]);
  const [coins, setCoins] = useState<AgentLite[]>([]);
  const [busy, setBusy] = useState(false);
  const [coinTarget, setCoinTarget] = useState("");
  const [coinDelta, setCoinDelta] = useState(100);
  const [factionTarget, setFactionTarget] = useState("");
  const [newFaction, setNewFaction] = useState("eco");
  const [eventTarget, setEventTarget] = useState("");
  const [eventTitle, setEventTitle] = useState("Evento speciale");
  const [eventDesc, setEventDesc] = useState("Il Comandante ha decretato un evento.");

  const load = async () => {
    const [b, c] = await Promise.all([
      supabase.from("bases").select("agent,name,level,faction").order("agent"),
      supabase.from("agent_coins").select("agent,coins").order("agent"),
    ]);
    setBases((b.data as BaseLite[]) ?? []);
    setCoins((c.data as AgentLite[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const grantCoins = async () => {
    if (!coinTarget) return toast.error("Scegli un agente");
    setBusy(true);
    try {
      const cur = coins.find((c) => c.agent === coinTarget);
      const next = Math.max(0, (cur?.coins ?? 0) + coinDelta);
      if (cur) {
        await supabase.from("agent_coins").update({ coins: next, updated_at: new Date().toISOString() }).eq("agent", coinTarget);
      } else {
        await supabase.from("agent_coins").insert({ agent: coinTarget, coins: next });
      }
      await supabase.from("coin_transactions").insert({
        agent: coinTarget,
        amount: coinDelta,
        reason: `Decreto Comandante`,
      });
      toast.success(`${coinDelta >= 0 ? "+" : ""}${coinDelta} monete a ${coinTarget}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const setFaction = async () => {
    if (!factionTarget) return toast.error("Scegli un agente");
    setBusy(true);
    try {
      const { error } = await supabase
        .from("bases")
        .update({ faction: newFaction, updated_at: new Date().toISOString() })
        .eq("agent", factionTarget);
      if (error) throw error;
      toast.success(`Fazione di ${factionTarget} → ${newFaction}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore (forse solo il proprietario può cambiare la fazione)");
    } finally {
      setBusy(false);
    }
  };

  const setLevel = async (agent: string, level: number) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("bases")
        .update({ level, updated_at: new Date().toISOString() })
        .eq("agent", agent);
      if (error) throw error;
      toast.success(`${agent} → Lv ${level}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore (limitato dalle regole)");
    } finally {
      setBusy(false);
    }
  };

  const spawnEvent = async () => {
    if (!eventTarget) return toast.error("Scegli un agente");
    setBusy(true);
    try {
      const { error } = await supabase.from("village_events").insert({
        agent: eventTarget,
        kind: "decreto",
        severity: "high",
        title: eventTitle,
        description: eventDesc,
        payload: { decreto: true },
      });
      if (error) throw error;
      await supabase.from("mission_notifications").insert({
        agent: eventTarget,
        kind: "village_decree",
        payload: { title: eventTitle },
      });
      toast.success("Decreto inviato");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const clearAllEnemies = async () => {
    if (!confirm("Disattivare TUTTI i nemici sulla mappa?")) return;
    setBusy(true);
    try {
      await supabase
        .from("map_enemy_spawns")
        .update({ active: false, defeated_at: new Date().toISOString(), defeated_by: "papa" })
        .eq("active", true);
      toast.success("Mappa ripulita");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-strong p-4 flex flex-col gap-4 border-amber-500/40">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-amber-400" />
        <h3 className="font-display text-sm uppercase tracking-widest text-amber-400">
          Modalità Dio
        </h3>
        <button onClick={load} className="panel p-1 ml-auto" title="Ricarica">
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Riservato al Comandante. Modifica monete, fazioni, livelli ed eventi senza toccare il database.
      </p>

      {/* GRANT COINS */}
      <section className="panel p-3 flex flex-col gap-2 bg-card/30">
        <p className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1">
          <Coins className="h-3 w-3" /> Distribuisci monete
        </p>
        <select
          value={coinTarget}
          onChange={(e) => setCoinTarget(e.target.value)}
          className="px-2 py-1.5 bg-night/60 rounded-lg border border-primary/20 text-xs"
        >
          <option value="">— Scegli agente —</option>
          {bases.map((b) => (
            <option key={b.agent} value={b.agent}>
              {b.agent} ({coins.find((c) => c.agent === b.agent)?.coins ?? 0}💰)
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            value={coinDelta}
            onChange={(e) => setCoinDelta(parseInt(e.target.value) || 0)}
            className="flex-1 px-2 py-1.5 bg-night/60 rounded-lg border border-primary/20 text-xs"
          />
          <button onClick={() => { hapticTap(); grantCoins(); }} disabled={busy} className="btn-neon px-3 text-xs">
            Eroga
          </button>
        </div>
      </section>

      {/* FACTION & LEVEL */}
      <section className="panel p-3 flex flex-col gap-2 bg-card/30">
        <p className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1">
          <Zap className="h-3 w-3" /> Fazioni & livelli
        </p>
        <select
          value={factionTarget}
          onChange={(e) => setFactionTarget(e.target.value)}
          className="px-2 py-1.5 bg-night/60 rounded-lg border border-primary/20 text-xs"
        >
          <option value="">— Scegli base —</option>
          {bases.map((b) => (
            <option key={b.agent} value={b.agent}>
              {b.agent} · {b.faction ?? "nessuna"} · Lv{b.level}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={newFaction}
            onChange={(e) => setNewFaction(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-night/60 rounded-lg border border-primary/20 text-xs"
          >
            <option value="eco">Eco</option>
            <option value="tech">Tech</option>
            <option value="battle">Battle</option>
            <option value="mystic">Mystic</option>
          </select>
          <button onClick={() => { hapticTap(); setFaction(); }} disabled={busy} className="btn-neon px-3 text-xs">
            Imposta
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 5, 10].map((lv) => (
            <button
              key={lv}
              onClick={() => factionTarget && setLevel(factionTarget, lv)}
              disabled={busy || !factionTarget}
              className="panel px-2 py-1 text-[10px] disabled:opacity-50"
            >
              Lv {lv}
            </button>
          ))}
        </div>
      </section>

      {/* DECREE EVENT */}
      <section className="panel p-3 flex flex-col gap-2 bg-card/30">
        <p className="text-[10px] uppercase tracking-widest text-primary flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Decreto / evento custom
        </p>
        <select
          value={eventTarget}
          onChange={(e) => setEventTarget(e.target.value)}
          className="px-2 py-1.5 bg-night/60 rounded-lg border border-primary/20 text-xs"
        >
          <option value="">— Destinatario —</option>
          {bases.map((b) => (
            <option key={b.agent} value={b.agent}>{b.agent}</option>
          ))}
        </select>
        <input
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          placeholder="Titolo"
          className="px-2 py-1.5 bg-night/60 rounded-lg border border-primary/20 text-xs"
        />
        <textarea
          value={eventDesc}
          onChange={(e) => setEventDesc(e.target.value)}
          rows={2}
          className="px-2 py-1.5 bg-night/60 rounded-lg border border-primary/20 text-xs resize-none"
        />
        <button onClick={() => { hapticTap(); spawnEvent(); }} disabled={busy} className="btn-neon px-3 py-1.5 text-xs">
          Lancia decreto
        </button>
      </section>

      {/* DANGER ZONE */}
      <section className="panel p-3 flex flex-col gap-2 bg-card/30 border-amber-500/30">
        <p className="text-[10px] uppercase tracking-widest text-amber-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" /> Zona pericolosa
        </p>
        <button
          onClick={() => { hapticTap(); clearAllEnemies(); }}
          disabled={busy}
          className="panel px-3 py-2 text-[11px] text-amber-300 border-amber-500/40"
        >
          Disattiva tutti i nemici sulla mappa
        </button>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Database className="h-3 w-3" /> Tutte le modifiche sono tracciate negli eventi.
        </p>
      </section>
    </div>
  );
}
