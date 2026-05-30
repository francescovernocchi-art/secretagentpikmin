import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { FamilyTradePanel } from "@/components/game/FamilyTradePanel";
import { hapticTap } from "@/lib/haptic";

export const Route = createFileRoute("/villaggio/scambi")({
  component: ScambiPage,
  head: () => ({
    meta: [
      { title: "Scambi Famiglia · Mercato" },
      { name: "description", content: "Scambia risorse con la famiglia via FamilyTradePanel." },
    ],
  }),
});

function ScambiPage() {
  return (
    <PageShell
      title="Mercato Scambi"
      subtitle="Scambi P2P famiglia · Phase 4"
      action={
        <Link to="/villaggio" onClick={hapticTap} className="panel px-2 py-1 text-[11px] flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Villaggio
        </Link>
      }
    >
      <div className="panel-strong p-3 mb-3 flex items-center gap-3">
        <span className="text-3xl">🏪</span>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary">Mercato del Villaggio</p>
          <p className="text-xs text-muted-foreground">
            Sistema unificato Phase 4 — scambi reali con inventario, notifiche e fallback locale.
          </p>
        </div>
      </div>
      <FamilyTradePanel />
    </PageShell>
  );
}
