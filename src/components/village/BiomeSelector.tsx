import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Mountain, Loader2, Settings2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { resolveBiome, type BiomeKey } from "@/lib/village/biomes";
import { useCustomBiomes } from "@/hooks/useCustomBiomes";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { toast } from "sonner";

interface Props {
  agent: string;
  currentTheme: string | null | undefined;
  onChanged?: (key: BiomeKey) => void;
}

export function BiomeSelector({ agent, currentTheme, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<BiomeKey | null>(null);
  const [isPapa, setIsPapa] = useState(false);
  const { allBiomes } = useCustomBiomes();
  const current = resolveBiome(currentTheme);

  useEffect(() => {
    setIsPapa(getSession()?.role === "papa");
  }, []);

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
    toast.success(`Bioma cambiato in ${allBiomes.find((b) => b.key === key)?.label}`);
    onChanged?.(key);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="panel-strong w-full px-3 py-2.5 text-xs inline-flex items-center justify-between gap-2 hover:bg-primary/20 transition min-h-[44px]"
      >
        <span className="inline-flex items-center gap-2">
          <Mountain className="h-3.5 w-3.5" /> Bioma: {current.emoji} {current.label}
        </span>
        <span className="text-[10px] text-muted-foreground">Tocca per cambiare</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex flex-col max-h-[86dvh] h-[86dvh] rounded-t-2xl border-primary/40 !z-50 p-0"
          style={{
            backgroundColor: "oklch(0.14 0.04 250 / 0.98)",
            backgroundImage:
              "linear-gradient(180deg, oklch(0.20 0.05 250 / 0.98), oklch(0.12 0.04 250 / 0.98))",
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader
            className="px-5 pb-3 shrink-0 border-b border-border/30"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)" }}
          >
            <SheetTitle className="text-base">Scegli il bioma del villaggio</SheetTitle>
          </SheetHeader>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 [-webkit-overflow-scrolling:touch]"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allBiomes.map((b) => {
                const active = b.key === current.key;
                return (
                  <div key={b.key} className="space-y-1.5">
                    <button
                      disabled={saving !== null}
                      onClick={() => pick(b.key)}
                      className={`relative overflow-hidden rounded-xl border text-left transition group w-full min-h-[120px] ${
                        active
                          ? "border-primary ring-2 ring-primary"
                          : "border-border hover:border-primary/60"
                      }`}
                    >
                      <img
                        src={b.image}
                        alt={b.label}
                        loading="lazy"
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                        <div className="text-xs font-display flex items-center gap-1 text-white">
                          {b.emoji} {b.label}
                        </div>
                        <div className="text-[9px] text-white/70 leading-tight line-clamp-1">
                          {b.tagline}
                        </div>
                      </div>
                      {saving === b.key && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      )}
                    </button>
                    {isPapa && (
                      <Link
                        to="/villaggio/editor/$biome"
                        params={{ biome: b.key }}
                        onClick={() => setOpen(false)}
                        className="block text-center text-[10px] py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary inline-flex w-full items-center justify-center gap-1"
                      >
                        <Settings2 className="h-3 w-3" /> Editor
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-4">
              Cambiare bioma modifica solo l'aspetto del villaggio, non gli edifici esistenti.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
