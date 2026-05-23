import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { BottomNav } from "@/components/BottomNav";
import { BuzzButton } from "@/components/BuzzButton";
import { TacticalBackground } from "@/components/TacticalBackground";
import { getSession, refreshSession, clearSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-primary/80">// 404 · Settore sconosciuto</p>
        <h1 className="mt-2 font-display text-5xl text-glow text-foreground">Coordinate non valide</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Questa pagina non esiste o è stata declassificata. Torna alla base e riprova.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Torna alla base
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.4em] text-primary/80">// Anomalia di sistema</p>
        <h1 className="mt-2 font-display text-2xl text-glow text-foreground">
          Trasmissione interrotta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Qualcosa è andato storto durante il caricamento. Riprova o torna alla base.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Riprova
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Torna alla base
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" },
      { name: "theme-color", content: "#0a0e1f" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "007-Pikmin" },
      { title: "007-Pikagent · Base Segreta" },
      { name: "description", content: "Base segreta padre & figlio. Missioni, chat e radar Pikmin." },
      { property: "og:title", content: "007-Pikagent · Base Segreta" },
      { property: "og:description", content: "Base segreta padre & figlio. Missioni, chat e radar Pikmin." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "007-Pikagent · Base Segreta" },
      { name: "twitter:description", content: "Base segreta padre & figlio. Missioni, chat e radar Pikmin." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cf057b91-a420-4814-846b-fa5f9b51cfec/id-preview-19515d35--a5386c5c-88ee-466b-bc8d-d01d15128b52.lovable.app-1778746784968.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cf057b91-a420-4814-846b-fa5f9b51cfec/id-preview-19515d35--a5386c5c-88ee-466b-bc8d-d01d15128b52.lovable.app-1778746784968.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const qc = useQueryClient();
  const isApp = pathname !== "/";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session) {
        void refreshSession();
      } else {
        clearSession();
        if (window.location.pathname !== "/") router.navigate({ to: "/" });
      }
      qc.invalidateQueries();
      router.invalidate();
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);

  useEffect(() => {
    if (isApp && typeof window !== "undefined" && !getSession()) {
      router.navigate({ to: "/" });
    }
  }, [isApp, pathname, router]);

  return (
    <QueryClientProvider client={queryClient}>
      {isApp ? (
        <div className="relative min-h-screen">
          <TacticalBackground />
          <div className="relative z-10">
            <Outlet />
            <BuzzButton />
            <BottomNav />
          </div>
        </div>
      ) : (
        <Outlet />
      )}
    </QueryClientProvider>
  );
}
