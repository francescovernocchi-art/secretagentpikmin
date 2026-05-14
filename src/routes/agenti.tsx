import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Trash2, Shield, Loader2, X, UserPlus, ArrowLeft, Pencil, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";

export const Route = createFileRoute("/agenti")({
  component: AgentiPage,
});

type Agent = {
  id: string;
  name: string;
  pin: string;
  role: "papa" | "lorenzo";
  emoji: string;
  created_at: string;
};

const EMOJI_CHOICES = ["🕶️", "🧒", "👩", "👨", "👵", "👴", "🧑‍🚀", "🦸", "🧙", "🐱", "🐶", "🤖"];

function AgentiPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const isPapa = session?.role === "papa";

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"papa" | "lorenzo">("lorenzo");
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: true });
    setAgents((data ?? []) as Agent[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setName("");
    setPin("");
    setRole("lorenzo");
    setEmoji(EMOJI_CHOICES[0]);
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (a: Agent) => {
    setEditingId(a.id);
    setName(a.name);
    setPin(a.pin);
    setRole(a.role);
    setEmoji(a.emoji);
    setShowForm(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const submit = async () => {
    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 30) {
      toast.error("Il nome deve avere fra 2 e 30 caratteri");
      return;
    }
    if (!editingId && !/^\d{4}$/.test(pin)) {
      toast.error("Il PIN deve essere di 4 cifre");
      return;
    }
    if (editingId) {
      const original = agents.find((a) => a.id === editingId);
      if (!original) return;
      const changes: string[] = [];
      if (original.name !== cleanName) changes.push(`nome → "${cleanName}"`);
      if (original.emoji !== emoji) changes.push(`avatar → ${emoji}`);
      if (original.role !== role)
        changes.push(`ruolo → ${role === "papa" ? "Creator" : "Collector"}`);
      if (changes.length === 0) {
        toast.info("Nessuna modifica da salvare");
        return;
      }
      if (!confirm(`Confermare le modifiche a "${original.name}"?\n\n• ${changes.join("\n• ")}`)) {
        return;
      }
      setSaving(true);
      const { error } = await supabase
        .from("agents")
        .update({ name: cleanName, role, emoji })
        .eq("id", editingId);
      setSaving(false);
      if (error) {
        toast.error("Errore: " + error.message);
        return;
      }
      toast.success("Agente aggiornato");
      reset();
      load();
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("agents").insert({
      name: cleanName,
      pin,
      role,
      emoji,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Questo PIN è già usato. Sceglierne un altro.");
      else toast.error("Errore: " + error.message);
      return;
    }
    toast.success(`${emoji} ${cleanName} aggiunto come ${role === "papa" ? "Creator" : "Collector"}`);
    reset();
    load();
  };

  const remove = async (a: Agent) => {
    if (a.id === session?.agentId) {
      toast.error("Non puoi eliminare l'agente con cui sei loggato");
      return;
    }
    if (!confirm(`Eliminare l'agente "${a.name}"? Non potrà più accedere con il suo PIN.`)) return;
    const { error } = await supabase.from("agents").delete().eq("id", a.id);
    if (error) {
      toast.error("Errore: " + error.message);
      return;
    }
    toast.success("Agente eliminato");
    load();
  };

  if (!isPapa) {
    return (
      <PageShell title="Agenti" subtitle="Accesso riservato">
        <div className="panel-strong p-6 text-center space-y-3">
          <Shield className="h-8 w-8 text-primary mx-auto" />
          <p className="text-sm text-foreground">
            Solo gli agenti con ruolo <b>Papà / Creator</b> possono gestire la lista agenti.
          </p>
          <Link to="/base" className="inline-flex items-center gap-2 text-xs text-primary">
            <ArrowLeft className="h-3 w-3" /> Torna alla base
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Agenti" subtitle="Chi può accedere alla base segreta">
      <div className="space-y-3">
        {/* Toggle form */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-neon w-full py-3 flex items-center justify-center gap-2 text-sm"
          >
            <UserPlus className="h-4 w-4" /> Aggiungi nuovo agente
          </button>
        )}

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="panel-strong p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
                  // {editingId ? "Modifica agente" : "Nuovo agente"}
                </p>
                <button onClick={reset} className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Emoji */}
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

              {/* Name */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Nome
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="es. Mamma, Nonno…"
                  maxLength={30}
                  className="w-full mt-1 bg-background/40 border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* PIN */}
              {!editingId && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    PIN segreto (4 cifre)
                  </label>
                  <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    placeholder="0000"
                    className="w-full mt-1 bg-background/40 border border-border rounded-lg px-3 py-2 text-lg font-mono tracking-[0.5em] text-center"
                  />
                </div>
              )}
              {editingId && (
                <p className="text-[10px] text-muted-foreground">
                  Il PIN non può essere modificato. Per cambiarlo, elimina e ricrea l'agente.
                </p>
              )}

              {/* Ruolo */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Ruolo
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setRole("papa")}
                    className={`rounded-lg p-2.5 text-left border ${
                      role === "papa"
                        ? "border-primary bg-primary/15"
                        : "border-border bg-background/40"
                    }`}
                  >
                    <p className="text-xs text-foreground font-medium">🕶️ Creator</p>
                    <p className="text-[10px] text-muted-foreground">
                      Piazza drop, missioni, gestisce
                    </p>
                  </button>
                  <button
                    onClick={() => setRole("lorenzo")}
                    className={`rounded-lg p-2.5 text-left border ${
                      role === "lorenzo"
                        ? "border-primary bg-primary/15"
                        : "border-border bg-background/40"
                    }`}
                  >
                    <p className="text-xs text-foreground font-medium">🧒 Collector</p>
                    <p className="text-[10px] text-muted-foreground">
                      Raccoglie drop, completa missioni
                    </p>
                  </button>
                </div>
              </div>

              <button
                onClick={create}
                disabled={saving}
                className="btn-neon w-full py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crea agente
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lista agenti */}
        <div className="panel-strong p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary/80">
            // Agenti registrati ({agents.length})
          </p>
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          {!loading && agents.length === 0 && (
            <p className="text-xs text-muted-foreground">Ancora nessun agente.</p>
          )}
          {agents.map((a) => {
            const isMe = a.id === session?.agentId;
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 rounded-xl p-2.5 border ${
                  isMe ? "border-primary/50 bg-primary/5" : "border-border bg-background/30"
                }`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate flex items-center gap-1.5">
                    {a.name}
                    {isMe && (
                      <span className="text-[9px] uppercase tracking-widest text-primary">
                        (tu)
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.role === "papa" ? "Creator" : "Collector"} · PIN {a.pin}
                  </p>
                </div>
                <button
                  onClick={() => remove(a)}
                  disabled={isMe}
                  className="text-muted-foreground hover:text-destructive p-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Elimina"
                  title={isMe ? "Non puoi eliminare te stesso" : "Elimina agente"}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground text-center px-4">
          Ogni agente accede inserendo il proprio PIN nella schermata iniziale.
        </p>
      </div>
    </PageShell>
  );
}
