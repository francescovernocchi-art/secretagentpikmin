import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { CommandCenterHome } from "@/components/game/CommandCenterHome";
import { GAME_IDENTITY } from "@/data/secretPikminWorld";

export const Route = createFileRoute("/base")({
  component: BasePage,
});

function BasePage() {
  return (
    <PageShell
      title={GAME_IDENTITY.title}
      subtitle={`${GAME_IDENTITY.subtitle} · Centro Comando`}
      theme="home"
    >
      <CommandCenterHome />
    </PageShell>
  );
}
