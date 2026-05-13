import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { Plus, Heart } from "lucide-react";

export const Route = createFileRoute("/_app/ricordi")({
  component: RicordiPage,
});

interface Memory {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

function RicordiPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const [memories, setMemories] = useState<Memory[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");

  const load = async () => {
    const { data } = await supabase.from("memories").select("*").order("created_at", { ascending: false });
    setMemories((data ?? []) as Memory[]);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!title) return;
    await supabase.from("memories").insert({ title, content, image_url: image || null });
    setTitle(""); setContent(""); setImage(""); setOpen(false);
    load();
  };

  return (
    <PageShell
      title="Archivio Ricordi"
      subtitle="La nostra timeline segreta"
      action={
        <button onClick={() => setOpen((o) => !o)} className="btn-neon px-3 py-2 text-xs flex items-center gap-1">
          <Plus className="h-4 w-4" /> Aggiungi
        </button>
      }
    >
      {open && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="panel p-4 space-y-2">
          <input
            placeholder="Titolo del ricordo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <textarea
            placeholder="Racconta…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="URL foto (opzionale)"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="w-full rounded-xl bg-night/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button onClick={create} className="btn-neon w-full py-2 text-sm">Salva ricordo</button>
        </motion.div>
      )}

      <div className="relative pl-5">
        <span className="absolute left-2 top-2 bottom-2 w-px bg-primary/30" />
        <div className="space-y-4">
          {memories.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative"
            >
              <span className="absolute -left-3.5 top-3 h-3 w-3 rounded-full bg-primary glow-soft" />
              <div className="panel p-4">
                <p className="text-[10px] uppercase tracking-widest text-primary/80">
                  {new Date(m.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <h3 className="font-display text-lg text-glow mt-1">{m.title}</h3>
                {m.image_url && (
                  <img src={m.image_url} alt={m.title} loading="lazy" className="mt-2 rounded-xl border border-border w-full max-h-60 object-cover" />
                )}
                {m.content && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{m.content}</p>}
              </div>
            </motion.div>
          ))}
          {memories.length === 0 && (
            <div className="panel p-6 text-center">
              <Heart className="h-6 w-6 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                Nessun ricordo ancora. Salvane uno {session?.name ? `, ${session.name}` : ""}.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
