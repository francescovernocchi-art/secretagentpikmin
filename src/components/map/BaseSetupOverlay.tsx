import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { MapPin, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  visible: boolean;
  pendingPos: { lat: number; lng: number } | null;
  agent: string;
  onCancel: () => void;
  onCreated: () => void;
}

const FACTIONS = [
  { key: "eco", emoji: "🌿", label: "Ecologisti" },
  { key: "tech", emoji: "⚡", label: "Tecnologi" },
  { key: "battle", emoji: "⚔️", label: "Guerrieri" },
  { key: "mystic", emoji: "🔮", label: "Mistici" },
];

/** Overlay onboarding: scegli il Campo Base sulla mappa. */
export function BaseSetupOverlay({ visible, pendingPos, agent, onCancel, onCreated }: Props) {
  const [name, setName] = useState("Campo Base");
  const [faction, setFaction] = useState<string>("eco");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!pendingPos) return;
    setSaving(true);
    const { error } = await supabase.from("bases").upsert(
      {
        agent,
        name,
        base_name: name,
        lat: pendingPos.lat,
        lng: pendingPos.lng,
        faction,
        action_radius: 300,
        threat_radius: 300,
      },
      { onConflict: "agent" },
    );
    setSaving(false);
    if (error) {
      toast.error("Errore: " + error.message);
      return;
    }
    toast.success(`Campo Base "${name}" creato!`);
    onCreated();
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-[500] pointer-events-none"
      >
        {!pendingPos ? (
          <div className="absolute top-3 left-3 right-3 panel-strong p-3 pointer-events-auto">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-1">
              // Onboarding
            </p>
            <p className="text-sm font-display text-glow flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Scegli il tuo Campo Base
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tocca un punto sulla mappa per posizionare il tuo Campo Base. Da lì
              cresceranno il tuo villaggio e le tue difese.
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-3 left-3 right-3 panel-strong p-4 pointer-events-auto space-y-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
                // Nuovo Campo Base
              </p>
              <button onClick={onCancel} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome del Campo Base"
              className="w-full bg-background/40 border border-border rounded-lg px-3 py-2 text-sm"
              maxLength={40}
            />
            <div className="grid grid-cols-4 gap-1.5">
              {FACTIONS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFaction(f.key)}
                  className={`p-2 rounded-lg border text-center ${
                    faction === f.key
                      ? "border-primary bg-primary/15"
                      : "border-border bg-background/40"
                  }`}
                >
                  <div className="text-xl">{f.emoji}</div>
                  <div className="text-[9px] uppercase tracking-wider mt-1">{f.label}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Coordinate: {pendingPos.lat.toFixed(5)}, {pendingPos.lng.toFixed(5)}
            </p>
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="btn-neon w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              Fonda qui il Campo Base
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
