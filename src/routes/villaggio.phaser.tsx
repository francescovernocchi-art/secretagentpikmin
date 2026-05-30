import { createFileRoute } from "@tanstack/react-router";
import { VillaggioPhaserView } from "@/components/village/VillaggioPhaserView";

export const Route = createFileRoute("/villaggio/phaser")({
  component: VillaggioPhaserView,
  head: () => ({ meta: [{ title: "Villaggio Phaser RTS" }] }),
});
