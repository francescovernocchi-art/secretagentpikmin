import { useState } from "react";
import { motion } from "framer-motion";
import { Palette, Save, X, Sparkles } from "lucide-react";
import { hapticTap } from "@/lib/haptic";
import { toast } from "sonner";
import {
  type VillageCosmetics,
  type GroundPattern,
  type PikminAccessory,
  type PikminAura,
  COSMETIC_PRESETS,
  saveCosmetics,
  patternBackground,
} from "@/lib/village/cosmetics";

const PATTERNS: { key: GroundPattern; label: string }[] = [
  { key: "erba", label: "Erba" },
  { key: "esagoni", label: "Esagoni" },
  { key: "rune", label: "Rune" },
  { key: "circuito", label: "Circuito" },
  { key: "sabbia", label: "Sabbia" },
  { key: "liscio", label: "Liscio" },
];

const ACCESSORIES: { key: PikminAccessory; emoji: string; label: string }[] = [
  { key: "nessuno", emoji: "🌱", label: "Nessuno" },
  { key: "foglia", emoji: "🍃", label: "Foglia" },
  { key: "fiore", emoji: "🌸", label: "Fiore" },
  { key: "cappello", emoji: "🎩", label: "Cappello" },
  { key: "elmo", emoji: "⛑️", label: "Elmo" },
  { key: "stella", emoji: "⭐", label: "Stella" },
  { key: "antenna", emoji: "📡", label: "Antenna" },
];

const AURAS: { key: PikminAura; label: string }[] = [
  { key: "nessuna", label: "Nessuna" },
  { key: "soffice", label: "Soffice" },
  { key: "neon", label: "Neon" },
  { key: "scintille", label: "Scintille" },
  { key: "ombra", label: "Ombra" },
];

interface Props {
  agent: string;
  initial: VillageCosmetics;
  onClose: () => void;
  onSaved: () => void;
}

export function VillageCustomizer({ agent, initial, onClose, onSaved }: Props) {
  const [c, setC] = useState<VillageCosmetics>(initial);
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof VillageCosmetics>(k: K, v: VillageCosmetics[K]) =>
    setC((prev) => ({ ...prev, [k]: v }));

  const applyPreset = (key: string) => {
    const p = COSMETIC_PRESETS[key];
    if (!p) return;
    setC((prev) => ({ ...prev, ...p }));
  };

  const save = async () => {
    setBusy(true);
    try {
      await saveCosmetics(agent, c);
      toast.success("Estetica del villaggio aggiornata");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-2"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="panel-strong w-full max-w-md p-4 flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm uppercase tracking-widest text-primary">Estetica villaggio</h3>
          </div>
          <button onClick={onClose} className="panel p-1.5">
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Anteprima */}
        <div
          className="relative h-32 rounded-xl overflow-hidden border border-primary/30"
          style={{ background: `linear-gradient(180deg, ${c.skyTop}, ${c.skyBottom})` }}
        >
          <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: c.groundColor }} />
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 opacity-70"
            style={{ background: patternBackground(c.pattern, c.accentColor) }}
          />
          {/* mini pikmin */}
          {[20, 50, 80].map((x, i) => (
            <div key={i} className="absolute" style={{ left: `${x}%`, bottom: "20%" }}>
              <div className="text-[10px] text-center leading-none">
                {ACCESSORIES.find((a) => a.key === c.pikminAccessory)?.emoji}
              </div>
              <div
                className="w-3 h-3 rounded-full mx-auto"
                style={{
                  background: `radial-gradient(circle at 35% 30%, #fff8, ${c.pikminBody} 60%, #0006)`,
                  boxShadow:
                    c.pikminAura === "neon"
                      ? `0 0 10px ${c.pikminBody}`
                      : c.pikminAura === "scintille"
                        ? `0 0 6px ${c.accentColor}`
                        : c.pikminAura === "ombra"
                          ? "0 0 6px #000a"
                          : "0 0 4px #0006",
                }}
              />
            </div>
          ))}
        </div>

        {/* Preset */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1.5">Preset rapidi</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(COSMETIC_PRESETS).map(([k, p]) => (
              <button
                key={k}
                onClick={() => {
                  hapticTap();
                  applyPreset(k);
                }}
                className="panel p-2 flex flex-col items-center gap-0.5 active:scale-95"
              >
                <span className="text-lg">{p.emoji}</span>
                <span className="text-[9px] leading-tight text-center">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Colori */}
        <div className="grid grid-cols-2 gap-2">
          <ColorRow label="Cielo alto" value={c.skyTop} onChange={(v) => update("skyTop", v)} />
          <ColorRow label="Cielo basso" value={c.skyBottom} onChange={(v) => update("skyBottom", v)} />
          <ColorRow label="Terreno" value={c.groundColor} onChange={(v) => update("groundColor", v)} />
          <ColorRow label="Accento" value={c.accentColor} onChange={(v) => update("accentColor", v)} />
          <ColorRow label="Corpo Pikmin" value={c.pikminBody} onChange={(v) => update("pikminBody", v)} />
        </div>

        {/* Pattern terreno */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1.5">Pattern terreno</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PATTERNS.map((p) => (
              <button
                key={p.key}
                onClick={() => update("pattern", p.key)}
                className={`panel p-2 text-[10px] ${c.pattern === p.key ? "border-primary text-primary" : ""}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accessorio */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1.5">Accessorio Pikmin</p>
          <div className="grid grid-cols-4 gap-1.5">
            {ACCESSORIES.map((a) => (
              <button
                key={a.key}
                onClick={() => update("pikminAccessory", a.key)}
                className={`panel p-2 flex flex-col items-center gap-0.5 ${c.pikminAccessory === a.key ? "border-primary glow-soft" : ""}`}
              >
                <span className="text-base">{a.emoji}</span>
                <span className="text-[9px]">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Aura */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1.5 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Aura
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {AURAS.map((a) => (
              <button
                key={a.key}
                onClick={() => update("pikminAura", a.key)}
                className={`panel p-1.5 text-[10px] ${c.pikminAura === a.key ? "border-primary text-primary" : ""}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={busy}
          onClick={save}
          className="btn-neon py-2.5 text-xs flex items-center justify-center gap-1.5 mt-1 disabled:opacity-60"
        >
          <Save className="h-3 w-3" />
          {busy ? "Salvataggio…" : "Salva estetica"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="panel p-2 flex items-center gap-2 cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 rounded border-0 bg-transparent cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-[10px] font-mono truncate">{value}</p>
      </div>
    </label>
  );
}
