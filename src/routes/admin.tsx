import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { refreshSession } from "@/lib/session";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PikminEditor } from "@/components/admin/PikminEditor";
import { CardsEditor } from "@/components/admin/CardsEditor";
import { AudioEditor } from "@/components/admin/AudioEditor";
import { MissionsEditor } from "@/components/admin/MissionsEditor";
import { RewardsEditor } from "@/components/admin/RewardsEditor";
import { BuildingsEditor } from "@/components/admin/BuildingsEditor";
import { MonstersEditor } from "@/components/admin/MonstersEditor";
import { AssetLibraryEditor } from "@/components/admin/AssetLibraryEditor";
import { Crown } from "lucide-react";

function AdminPage() {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    let cancelled = false;
    // Verify role server-side via Supabase (don't trust localStorage).
    refreshSession()
      .then((s) => {
        if (cancelled) return;
        if (s?.role !== "papa") navigate({ to: "/" });
        else setVerified(true);
      })
      .catch(() => {
        if (!cancelled) navigate({ to: "/" });
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);
  if (!verified) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Verifica permessi Comandante…
      </div>
    );
  }
  return (
    <div className="p-3 pb-28 max-w-3xl mx-auto flex flex-col gap-3">
      <header className="panel-strong p-3 flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-400" />
        <div>
          <h1 className="font-display text-lg">Pannello Admin</h1>
          <p className="text-[11px] text-muted-foreground">Personalizza ogni cosa del gioco. Le immagini caricate qui sono usate ovunque appaiano pikmin, mostri, edifici, carte e premi.</p>
        </div>
      </header>
      <AdminTabs tabs={[
        { key: "pikmin", label: "Pikmin", icon: "🌱", render: () => <PikminEditor /> },
        { key: "mostri", label: "Mostri", icon: "👾", render: () => <MonstersEditor /> },
        { key: "strutture", label: "Strutture", icon: "🏛️", render: () => <BuildingsEditor /> },
        { key: "sprite", label: "Libreria Sprite", icon: "🖼️", render: () => <AssetLibraryEditor /> },
        { key: "carte", label: "Carte", icon: "🃏", render: () => <CardsEditor /> },
        { key: "missioni", label: "Missioni", icon: "🎯", render: () => <MissionsEditor /> },
        { key: "premi", label: "Premi", icon: "🏆", render: () => <RewardsEditor /> },
        { key: "audio", label: "Audio", icon: "🎵", render: () => <AudioEditor /> },
      ]} />
    </div>
  );
}

export const Route = createFileRoute("/admin")({ component: AdminPage });
