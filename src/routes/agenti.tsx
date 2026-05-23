import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Shield, Loader2, X, ArrowLeft, Pencil, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/agenti")({
  component: AgentiPage,
});

type Profile = {
  user_id: string;
  name: string;
  agent_key: "papa" | "lorenzo";
  emoji: string;
};

const EMOJI_CHOICES = ["🕶️", "🧑", "👩", "👨", "👵", "👴", "🧑‍🚀", "🥷", "🛰️", "🐺", "🦊", "🤖"];

function AgentiPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const isPapa = session?.role === "papa";

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, name, agent_key, emoji")
      .order("created_at", { ascending: true });
    setProfiles((data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setName("");
    setEmoji(EMOJI_CHOICES[0]);
    setEditingId(null);
  };

  const startEdit = (p: Profile) => {
    setEditingId(p.user_id);
    setName(p.name);
    setEmoji(p.emoji);
  };

  const submit = async () => {
    if (!editingId) return;
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 30) {
      toast.error("Il nome deve avere fra 2 e 30 caratteri");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: cleanName, emoji })
      .eq("user_id", editingId);
    setSaving(false);
    if (error) {
      toast.error("Errore: " + error.message);
      return;
    }
    toast.success("Profilo aggiornato");
    reset();
    load();
  };

  if (!isPapa) {
    return (
      <PageShell title="Agenti" subtitle="Accesso riservato">
        <div className="panel-strong p-6 text-center space-y-3">
          <Shield className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm text-foreground">
            Solo gli agenti con ruolo <b>Papà / Comandante</b> possono gestire la lista agenti.
          </p>
          <Link to="/base" className="inline-flex items-center gap-2 text-xs text-primary">
            <ArrowLeft className="h-3 w-3" /> Torna alla base
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Agenti" subtitle="Profili della famiglia">
      <div className="space-y-3">
        <AnimatePresence>
          {editingId && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="panel-strong p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
                  // Modifica profilo
                </p>
                <button onClick={reset} className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Avatar
                </label>
                <div className="grid grid-cols-6 gap-1.5 mt-1">
                  {EMOJI_CHOICES.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xl border ${
                        emoji === e
                          ? "border-primary bg-primary/15"
                          : "border-border bg-background/40"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Nome
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  className="w-full mt-1 bg-background/40 border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={submit}
                disabled={saving}
                className="btn-neon w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Salva modifiche
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="panel-strong p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
            // Agenti registrati ({profiles.length})
          </p>
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          {!loading && profiles.length === 0 && (
            <p className="text-xs text-muted-foreground">Ancora nessun agente.</p>
          )}
          {profiles.map((p) => {
            const isMe = p.user_id === session?.agentId;
            return (
              <div
                key={p.user_id}
                className={`flex items-center gap-3 rounded-xl p-2.5 border ${
                  isMe ? "border-primary/50 bg-primary/5" : "border-border bg-background/30"
                }`}
              >
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate flex items-center gap-1.5">
                    {p.name}
                    {isMe && (
                      <span className="text-[9px] uppercase tracking-widest text-primary">
                        (tu)
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.agent_key === "papa" ? "Comandante" : "Operativo"}
                  </p>
                </div>
                {isMe && (
                  <button
                    onClick={() => startEdit(p)}
                    className="text-muted-foreground hover:text-primary p-1.5"
                    aria-label="Modifica"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground text-center px-4">
          Nuovi agenti si registrano dalla schermata di login con email e password.
        </p>
      </div>
    </PageShell>
  );
}
