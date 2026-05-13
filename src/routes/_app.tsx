import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getSession } from "@/lib/session";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getSession()) {
      throw redirect({ to: "/" });
    }
  },
  component: () => (
    <div className="grid-bg min-h-screen">
      <Outlet />
      <BottomNav />
    </div>
  ),
});
