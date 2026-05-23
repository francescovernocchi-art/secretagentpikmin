import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSession } from "@/lib/session";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { PikminEditor } from "@/components/admin/PikminEditor";
import { CardsEditor } from "@/components/admin/CardsEditor";
import { AudioEditor } from "@/components/admin/AudioEditor";
import { MissionsEditor } from "@/components/admin/MissionsEditor";
import { RewardsEditor } from "@/components/admin/RewardsEditor";
import { Crown } from "lucide-react";

function AdminPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const s = getSession();
    if (s?.role !== "papa") navigate({ to: "/" });
  }, [navigate]);
  return (
    <div className="p-3 pb-28 max-w-3xl mx-auto flex flex-col gap-3">
      <header className="panel-strong p-3 flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-400" />
        <div>
          <h1 className="font-display text-lg">Pannello Admin</h1>
          <p className="text-[11px] text-muted-foreground">Personalizza ogni cosa del gioco. Le immagini caricate qui sono usate ovunque appaiano i pikmin, le carte, i premi e le missioni.</p>
        </div>
      </header>
      <AdminTabs tabs={[
        { key: "pikmin", label: "Pikmin", icon: "🌱", render: () => <PikminEditor /> },
        { key: "carte", label: "Carte", icon: "🃏", render: () => <CardsEditor /> },
        { key: "missioni", label: "Missioni", icon: "🎯", render: () => <MissionsEditor /> },
        { key: "premi", label: "Premi", icon: "🏆", render: () => <RewardsEditor /> },
        { key: "audio", label: "Audio", icon: "🎵", render: () => <AudioEditor /> },
      ]} />
    </div>
  );
}

export const Route = createFileRoute("/admin")({ component: AdminPage });
