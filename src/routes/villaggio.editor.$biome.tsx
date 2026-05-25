import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Mountain } from "lucide-react";
import { getSession } from "@/lib/session";
import { resolveBiome } from "@/lib/village/biomes";
import { useCustomBiomes } from "@/hooks/useCustomBiomes";
import { BiomeEditorTabs, type EditorTab } from "@/components/village/editor/BiomeEditorTabs";
import { DioramaTab } from "@/components/village/editor/DioramaTab";
import { SlotEditorTab } from "@/components/village/editor/SlotEditorTab";

export const Route = createFileRoute("/villaggio/editor/$biome")({
  component: BiomeEditorPage,
  head: () => ({
    meta: [
      { title: "Editor Bioma · Villaggio" },
      {
        name: "description",
        content: "Gestisci diorama, slot, asset, varianti, bonus ed eventi di un bioma.",
      },
    ],
  }),
});

function BiomeEditorPage() {
  const { biome } = Route.useParams();
  const navigate = useNavigate();
  const { allBiomes } = useCustomBiomes();
  const [tab, setTab] = useState<EditorTab>("diorama");
  const [isPapa, setIsPapa] = useState<boolean | null>(null);

  useEffect(() => {
    setIsPapa(getSession()?.role === "papa");
  }, []);

  const meta = allBiomes.find((b) => b.key === biome) ?? resolveBiome(biome);

  if (isPapa === false) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm">Solo i Comandanti possono accedere all'Editor Bioma.</p>
        <Link to="/villaggio" className="btn-neon mt-4 px-4 py-2 text-xs">
          Torna al villaggio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="sticky top-0 z-20 px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/40 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/villaggio" })}
          className="panel p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
          aria-label="Indietro"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-primary inline-flex items-center gap-1">
            <Mountain className="h-3 w-3" /> Editor Bioma
          </p>
          <h1 className="text-sm font-display truncate">
            {meta.emoji} {meta.label}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 pt-2 pb-8 overflow-y-auto">
        <BiomeEditorTabs active={tab} onChange={setTab} />

        <div className="pt-4">
          {tab === "diorama" && <DioramaTab biomeKey={biome} />}
          {tab === "slots" && <SlotEditorTab biomeKey={biome} />}
          {tab === "structures" && (
            <ComingSoon
              title="Asset Strutture"
              desc="Upload asset per livello (lv1-lv5) separati per bioma. Arriva nella Fase 3."
            />
          )}
          {tab === "variants" && (
            <ComingSoon
              title="Varianti visive"
              desc="Più asset per stesso livello, scelta random o forzata. Arriva nella Fase 4."
            />
          )}
          {tab === "bonus" && (
            <ComingSoon
              title="Bonus bioma"
              desc="Bonus bioma, struttura, stack, eventi. Arriva nella Fase 4."
            />
          )}
          {tab === "events" && (
            <ComingSoon
              title="Eventi del bioma"
              desc="Overlay, particelle, atmosfera. Arriva nella Fase 5."
            />
          )}
        </div>
      </main>
    </div>
  );
}

function ComingSoon({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="panel p-6 text-center space-y-2">
      <p className="text-sm font-display">{title}</p>
      <p className="text-[11px] text-muted-foreground">{desc}</p>
    </div>
  );
}
