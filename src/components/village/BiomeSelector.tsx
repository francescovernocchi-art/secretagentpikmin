import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mountain, Loader2 } from "lucide-react";
import { BIOME_LIST, resolveBiome, type BiomeKey } from "@/lib/village/biomes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  agent: string;
  currentTheme: string | null | undefined;
  onChanged?: (key: BiomeKey) => void;
}

export function BiomeSelector({ agent, currentTheme, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<BiomeKey | null>(null);
  const current = resolveBiome(currentTheme);

  const pick = async (key: BiomeKey) => {
    if (key === current.key) {
      setOpen(false);
      return;
    }
    setSaving(key);
    const { error } = await supabase.from("bases").update({ theme: key }).eq("agent", agent);
    setSaving(null);
    if (error) {
      toast.error("Impossibile cambiare bioma: " + error.message);
      return;
    }
    toast.success(`Bioma cambiato in ${BIOME_LIST.find((b) => b.key === key)?.label}`);
    onChanged?.(key);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="panel-strong px-3 py-1.5 text-xs inline-flex items-center gap-2 hover:bg-primary/20 transition">
          <Mountain className="h-3.5 w-3.5" /> Bioma: {current.emoji} {current.label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scegli il bioma del villaggio</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BIOME_LIST.map((b) => {
            const active = b.key === current.key;
            return (
              <button
                key={b.key}
                disabled={saving !== null}
                onClick={() => pick(b.key)}
                className={`relative overflow-hidden rounded-xl border text-left transition group ${
                  active ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/60"
                }`}
              >
                <img
                  src={b.image}
                  alt={b.label}
                  loading="lazy"
                  className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 to-transparent">
                  <div className="text-xs font-display flex items-center gap-1 text-white">
                    {b.emoji} {b.label}
                  </div>
                  <div className="text-[9px] text-white/70 leading-tight line-clamp-1">{b.tagline}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {b.bonuses.slice(0, 2).map((bonus) => (
                      <span key={bonus} className="text-[8px] px-1 py-px rounded bg-white/20 text-white">
                        {bonus}
                      </span>
                    ))}
                  </div>
                </div>
                {saving === b.key && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          Cambiare bioma modifica solo l'aspetto del villaggio, non gli edifici esistenti.
        </p>
      </DialogContent>
    </Dialog>
  );
}
