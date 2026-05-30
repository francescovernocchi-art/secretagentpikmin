import { motion } from "framer-motion";
import { useState } from "react";
import { FACTION_LIST, FactionKey } from "@/lib/village/factions";
import { supabase } from "@/integrations/supabase/client";
import { hapticTap } from "@/lib/haptic";
import { PageShell } from "@/components/PageShell";

interface Props {
  agent: string;
  onChosen: () => void;
}

export function FactionSelector({ agent, onChosen }: Props) {
  const [selected, setSelected] = useState<FactionKey | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("bases")
        .update({ faction: selected, updated_at: new Date().toISOString() })
        .eq("agent", agent);
      if (error) throw error;
      await supabase.from("village_events").insert({
        agent,
        kind: "faction_chosen",
        severity: "normal",
        title: `Hai fondato una ${FACTION_LIST.find((f) => f.key === selected)?.name}`,
        description: "La tua colonia ha trovato la sua identità.",
        payload: { faction: selected },
      });
      onChosen();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Scegli la tua colonia"
      subtitle="Ogni fazione cambia gameplay, atmosfera e Pikmin favoriti. Scelta permanente."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FACTION_LIST.map((f, i) => {
          const active = selected === f.key;
          return (
            <motion.button
              key={f.key}
              onClick={() => {
                hapticTap();
                setSelected(f.key);
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition ${
                active
                  ? "border-primary shadow-[0_0_25px_var(--color-primary)]"
                  : "border-primary/20"
              }`}
              style={{
                background: `linear-gradient(135deg, ${f.secondary}99, ${f.primary}22)`,
              }}
            >
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 80% 20%, ${f.glow}66, transparent 60%)`,
                }}
              />
              <div className="relative flex items-start gap-3">
                <span className="text-4xl drop-shadow-lg">{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: f.glow }}>
                    {f.tagline}
                  </p>
                  <h3 className="font-display text-lg text-foreground">{f.name}</h3>
                  <p className="text-xs text-foreground/80 mt-1 leading-snug">{f.description}</p>
                </div>
              </div>
              <div className="relative mt-3 grid grid-cols-2 gap-1 text-[10px]">
                <Bonus label="Crescita Pikmin" value={`×${f.bonuses.pikminGrowthMult}`} />
                <Bonus label="Energia max" value={`+${f.bonuses.energyMaxBonus}`} />
                <Bonus label="Difesa base" value={`+${f.bonuses.defenseBonus}`} />
                <Bonus label="Scoperte rare" value={`+${Math.round(f.bonuses.discoveryRate * 100)}%`} />
              </div>
              <p className="relative mt-2 text-[10px] text-foreground/60 italic">
                ⚠ {f.weakness}
              </p>
            </motion.button>
          );
        })}
      </div>

      <button
        disabled={!selected || busy}
        onClick={confirm}
        className="btn-neon w-full py-3 text-sm disabled:opacity-50"
      >
        {busy
          ? "Stabilisco la colonia…"
          : selected
            ? `Fonda ${FACTION_LIST.find((f) => f.key === selected)?.name}`
            : "Seleziona una fazione"}
      </button>
    </PageShell>
  );
}

function Bonus({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-night/60 px-2 py-1 border border-primary/15">
      <p className="text-foreground/60">{label}</p>
      <p className="text-primary font-semibold">{value}</p>
    </div>
  );
}
