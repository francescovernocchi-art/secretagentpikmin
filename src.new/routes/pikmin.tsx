import { createFileRoute, redirect } from "@tanstack/react-router";

/** Alias QA: /pikmin → /archivio (menu Pikmin) */
export const Route = createFileRoute("/pikmin")({
  beforeLoad: () => {
    throw redirect({ to: "/archivio" });
  },
});
