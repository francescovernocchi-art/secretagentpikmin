import { createFileRoute, Link } from "@tanstack/react-router";
import { Gamepad2, Home, Map } from "lucide-react";
import { motion } from "framer-motion";
import { VillageDiorama } from "@/components/game/VillageDiorama";
import { VillageGameHUD } from "@/components/game/diorama/VillageGameHUD";
import { VillageContextStrip } from "@/components/game/diorama/VillageContextStrip";
import { getBiomeByKey } from "@/data/secretPikminWorld";
import { GAME_IDENTITY } from "@/data/secretPikminWorld";
import { hapticTap } from "@/lib/haptic";
import { usePlayerBiome, useVillageDiorama } from "@/hooks/useGameData";
import { getSession } from "@/lib/session";
import { agentKeyFromSession } from "@/lib/game/planet";

export const Route = createFileRoute("/villaggio")({
  component: VillaggioDioramaPage,
  head: () => ({
    meta: [
      { title: "Villaggio Pikmin · Diorama" },
      { name: "description", content: "Il tuo villaggio isometrico vivo — edifici, Pikmin e navicella." },
    ],
  }),
});

function VillaggioDioramaPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKeyFromSession(session?.role);
  const { biome } = usePlayerBiome(agent);
  const { villageName, loading } = useVillageDiorama(agent);
  const biomeDef = getBiomeByKey(biome);

  return (
    <div className="min-h-[100dvh] pb-24 overflow-x-hidden section-theme-village bg-[linear-gradient(180deg,oklch(0.12_0.04_250)_0%,oklch(0.08_0.03_280)_100%)]">
      {/* Top bar */}
      <header
        className="sticky top-0 z-30 border-b border-primary/10 bg-night/75 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between px-3 py-1.5 gap-2">
          <Link to="/base" onClick={hapticTap} className="panel p-1.5 shrink-0" aria-label="Torna al centro comando">
            <Home className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[8px] uppercase tracking-[0.35em] text-primary/60">{GAME_IDENTITY.title}</p>
            <h1 className="font-display text-sm text-glow truncate">{loading ? "…" : villageName || "Villaggio"}</h1>
          </div>
          <Link to="/mappa" onClick={hapticTap} className="panel p-1.5 shrink-0" aria-label="Apri mappa biomi">
            <Map className="h-4 w-4" />
          </Link>
        </div>
        <VillageGameHUD biomeLabel={biomeDef?.label} biomeEmoji={biomeDef?.emoji} compactExtras />
      </header>

      <main className="px-2 pt-2 space-y-2 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <VillageDiorama fullScreen showFooter ownerAgent={agent} />
        </motion.div>

        <VillageContextStrip />

        {/* Quick actions compatte: il focus visivo resta sul luogo fisico. */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <QuickTile to="/villaggio/edifici" emoji="🏗️" label="Edifici" />
          <QuickTile to="/villaggio/scambi" emoji="🤝" label="Scambi" />
          <QuickTile to="/navicella" emoji="🚀" label="Navicella" />
          <QuickTile to="/villaggio/phaser" emoji="🎮" label="Phaser RTS" icon={<Gamepad2 className="h-4 w-4 text-primary" />} />
        </div>

        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-widest px-4">
          Clicca un edificio o la navicella · Modalità Phaser RTS disponibile per costruzione avanzata
        </p>
      </main>
    </div>
  );
}

function QuickTile({
  to,
  emoji,
  label,
  icon,
}: {
  to: string;
  emoji: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={hapticTap}
      className="panel px-2.5 py-1.5 flex items-center gap-1.5 active:scale-95 transition-transform hover:ring-1 hover:ring-primary/30 shrink-0"
    >
      <span className="text-sm">{emoji}</span>
      {icon}
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </Link>
  );
}
