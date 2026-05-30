import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { isDemoModeActive, exitDemoMode, DEMO_AGENTS } from "@/lib/demo-mode";
import { getSession, clearSession } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/game/db";

export function DemoModeBanner() {
  const [hidden, setHidden] = useState(false);
  const session = typeof window !== "undefined" ? getSession() : null;

  if (!session || hidden) return null;
  if (!isDemoModeActive() && isSupabaseConfigured()) return null;

  const agent = session.role === "papa" ? DEMO_AGENTS.papa : DEMO_AGENTS.lorenzo;

  return (
    <div className="fixed bottom-[5.5rem] left-3 right-3 z-40 max-w-lg mx-auto pointer-events-none">
      <div className="market-card p-3 pointer-events-auto border-primary/40 shadow-lg">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-primary/80">Modalità demo</p>
            <p className="text-xs text-foreground/90 mt-0.5">
              Sei <strong>{agent.emoji} {agent.name}</strong>. Prova radar, market, villaggio, missioni e chat — tutto in locale.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Link to="/radar" className="btn-neon px-2 py-1 text-[9px] uppercase tracking-wider">Scanner</Link>
              <Link to="/mercato" className="btn-neon px-2 py-1 text-[9px] uppercase tracking-wider">Market</Link>
              <Link to="/villaggio" className="btn-neon px-2 py-1 text-[9px] uppercase tracking-wider">Villaggio</Link>
              <Link to="/missioni" className="btn-neon px-2 py-1 text-[9px] uppercase tracking-wider">Missioni</Link>
              <Link to="/chat" className="btn-neon px-2 py-1 text-[9px] uppercase tracking-wider">Chat</Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isDemoModeActive()) {
                exitDemoMode();
                clearSession();
                window.location.href = "/";
              } else setHidden(true);
            }}
            className="panel p-1 shrink-0"
            aria-label="Chiudi demo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
