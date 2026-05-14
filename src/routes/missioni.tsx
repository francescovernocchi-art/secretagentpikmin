import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { CameraCapture } from "@/components/CameraCapture";
import { grantIngredients, rollIngredients } from "@/lib/ingredients";
import { collectShipPart } from "@/lib/ship";
import { Plus, Check, Trophy, Sparkles, X, Camera, Rocket } from "lucide-react";

export const Route = createFileRoute("/missioni")({
  component: MissioniPage,
});

interface Mission {
  id: string;
  title: string;
  description: string | null;
  xp: number;
  difficulty: string;
  status: string;
  proof: string | null;
  created_at: string;
  created_by: string;
  reward_part_key: string | null;
}

interface ShipPartLite {
  key: string;
  name: string;
  emoji: string;
}

const SAMPLES = [
  { title: "Ricognizione zona verde", description: "Individua un obiettivo verde e fotografalo come prova.", xp: 15, difficulty: "facile" },
  { title: "Scheda creatura", description: "Schizza un nuovo modello di Pikmin per l'archivio.", xp: 25, difficulty: "media" },
  { title: "Documenta il bersaglio botanico", description: "Foto nitida di una pianta sospetta.", xp: 20, difficulty: "facile" },
  { title: "Operazione 'Buon segnale'", description: "Migliora la giornata di un civile (senza farti notare).", xp: 30, difficulty: "media" },
  { title: "Cifrario notturno", description: "Inventa un codice cifrato personale prima del rientro alla base.", xp: 50, difficulty: "rara" },
];

function MissioniPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const isAdmin = session?.role === "papa";
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "attive" | "completate">("all");
  const [shipParts, setShipParts] = useState<ShipPartLite[]>([]);
  const [collectedKeys, setCollectedKeys] = useState<Set<string>>(new Set());

  const load = async () => {
    const [{ data }, { data: parts }, { data: got }] = await Promise.all([
      supabase.from("missions").select("*").order("created_at", { ascending: false }),
      supabase.from("ship_parts").select("key, name, emoji").order("sort_order"),
      supabase.from("ship_parts_collected").select("part_key"),
    ]);
    setMissions((data ?? []) as Mission[]);
    setShipParts((parts ?? []) as ShipPartLite[]);
    setCollectedKeys(new Set((got ?? []).map((g) => g.part_key as string)));
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("missions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ship_parts_collected" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const update = async (id: string, patch: Partial<Mission>) => {
    await supabase.from("missions").update(patch).eq("id", id);
  };

  const partByKey = (key: string | null) =>
    key ? shipParts.find((p) => p.key === key) : undefined;

  const visible = missions.filter((m) => {
    if (filter === "attive") return m.status === "nuova" || m.status === "accettata";
    if (filter === "completate") return m.status === "completata" || m.status === "approvata";
    return true;
  });

  return (
    <PageShell
      title="Missioni"
      subtitle="Operazioni in corso"
      action={
        isAdmin && (
          <button onClick={() => setShowNew(true)} className="btn-neon px-3 py-2 text-xs flex items-center gap-1">
            <Plus className="h-4 w-4" /> Nuova
          </button>
        )
      }
    >
      <div className="flex gap-2">
        {(["all", "attive", "completate"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              filter === f ? "bg-primary text-primary-foreground" : "panel text-muted-foreground"
            }`}
          >
            {f === "all" ? "Tutte" : f}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-10">Nessuna missione qui.</p>
      )}

      <div className="space-y-3">
        <AnimatePresence>
          {visible.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="panel p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <DiffBadge d={m.difficulty} />
                    <StatusBadge s={m.status} />
                  </div>
                  <h3 className="font-display text-lg text-glow leading-tight">{m.title}</h3>
                  {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                  {m.proof && (
                    <div className="mt-2">
                      <p className="text-xs text-primary flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Prova
                      </p>
                      {m.proof.startsWith("http") ? (
                        <img
                          src={m.proof}
                          alt="prova"
                          className="mt-1 rounded-lg border border-primary/30 max-h-40 object-cover"
                        />
                      ) : (
                        <p className="text-xs text-muted-foreground">{m.proof}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">XP</p>
                  <p className="font-display text-xl text-primary text-glow">+{m.xp}</p>
                  {partByKey(m.reward_part_key) && (
                    <p className="mt-1 text-[10px] text-amber-300 flex items-center gap-1 justify-end">
                      <Rocket className="h-3 w-3" />
                      <span>{partByKey(m.reward_part_key)!.emoji}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {!isAdmin && m.status === "nuova" && (
                  <button onClick={() => update(m.id, { status: "accettata" })} className="btn-neon px-3 py-1.5 text-xs">
                    Accetta
                  </button>
                )}
                {!isAdmin && m.status === "accettata" && (
                  <CompleteButton onComplete={(proof) => update(m.id, { status: "completata", proof })} />
                )}
                {isAdmin && m.status === "completata" && (
                  <button
                    onClick={async () => {
                      await update(m.id, { status: "approvata" });
                      await supabase.from("rewards").insert({
                        agent: "lorenzo",
                        badge: "mission",
                        title: m.title,
                        icon: "🏅",
                      });
                      const drops = rollIngredients("mission");
                      await grantIngredients("lorenzo", drops);
                      if (m.reward_part_key) {
                        try {
                          await collectShipPart({
                            partKey: m.reward_part_key,
                            collectedBy: "lorenzo",
                            source: "mission",
                            missionId: m.id,
                          });
                        } catch {}
                      }
                    }}
                    className="btn-neon px-3 py-1.5 text-xs flex items-center gap-1"
                  >
                    <Trophy className="h-3 w-3" /> Approva &amp; Premia
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => supabase.from("missions").delete().eq("id", m.id)}
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive flex items-center gap-1"
                  >
                    <X className="h-3 w-3" /> Elimina
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showNew && (
        <NewMissionSheet
          shipParts={shipParts}
          collectedKeys={collectedKeys}
          onClose={() => setShowNew(false)}
        />
      )}
    </PageShell>
  );
}

function DiffBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    facile: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    media: "bg-yellow-500/20 text-yellow-200 border-yellow-500/40",
    difficile: "bg-orange-500/20 text-orange-200 border-orange-500/40",
    rara: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40",
  };
  return <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${map[d] ?? ""}`}>{d}</span>;
}

function StatusBadge({ s }: { s: string }) {
  return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-night/60 border border-primary/30 text-primary">
      {s}
    </span>
  );
}

function CompleteButton({ onComplete }: { onComplete: (proof: string) => void }) {
  const [proof, setProof] = useState("");
  const [open, setOpen] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-neon px-3 py-1.5 text-xs flex items-center gap-1">
        <Check className="h-3 w-3" /> Completa
      </button>
    );
  return (
    <div className="w-full space-y-2">
      {proof.startsWith("http") && (
        <img src={proof} alt="prova" className="rounded-lg border border-primary/30 max-h-32 object-cover" />
      )}
      <div className="flex gap-2">
        <input
          value={proof.startsWith("http") ? "📷 foto allegata" : proof}
          onChange={(e) => setProof(e.target.value)}
          placeholder="Prova della missione…"
          className="flex-1 rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary"
        />
        <button
          onClick={() => setCamOpen(true)}
          className="panel px-2 text-primary"
          aria-label="Foto"
        >
          <Camera className="h-4 w-4" />
        </button>
        <button onClick={() => proof && onComplete(proof)} className="btn-neon px-3 text-xs">
          OK
        </button>
      </div>
      <CameraCapture
        open={camOpen}
        onClose={() => setCamOpen(false)}
        onCaptured={(url) => setProof(url)}
        overlayLabel="// Prova missione"
        folder="missions"
      />
    </div>
  );
}

function NewMissionSheet({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [xp, setXp] = useState(20);
  const [difficulty, setDifficulty] = useState("facile");

  const create = async (preset?: typeof SAMPLES[number]) => {
    const payload = preset ?? { title, description, xp, difficulty };
    if (!payload.title) return;
    await supabase.from("missions").insert({ ...payload, status: "nuova", created_by: "papa" });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-night/80 backdrop-blur-sm flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full panel-strong rounded-b-none p-5 space-y-3 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-glow">Nuova Missione</h2>
          <button onClick={onClose} className="text-muted-foreground"><X /></button>
        </div>
        <input
          placeholder="Titolo missione"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <textarea
          placeholder="Descrizione"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          rows={3}
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">
            XP
            <input
              type="number"
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
              className="mt-1 w-full rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Difficoltà
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1 w-full rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="facile">Facile</option>
              <option value="media">Media</option>
              <option value="difficile">Difficile</option>
              <option value="rara">Rara</option>
            </select>
          </label>
        </div>
        <button onClick={() => create()} className="btn-neon w-full py-3 text-sm">Crea Missione</button>

        <div className="pt-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Missioni rapide</p>
          <div className="space-y-2">
            {SAMPLES.map((s) => (
              <button
                key={s.title}
                onClick={() => create(s)}
                className="w-full panel p-3 text-left flex items-center justify-between"
              >
                <div>
                  <p className="text-sm">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground">{s.description}</p>
                </div>
                <span className="text-primary text-sm">+{s.xp}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
