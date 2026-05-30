import { Bell, Check } from "lucide-react";
import { useGameNotifications } from "@/hooks/useGameData";

export function GameNotificationsPanel({ compact = false }: { compact?: boolean }) {
  const { notifications, unread, markRead, markAllRead } = useGameNotifications();

  return (
    <section className="space-y-2">
      {!compact && (
        <header className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Notifiche</p>
            <h2 className="font-display text-lg text-glow">Eventi di gioco</h2>
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-[10px] text-primary flex items-center gap-1">
              <Check className="h-3 w-3" /> Segna lette
            </button>
          )}
        </header>
      )}

      {notifications.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">Nessuna notifica</p>
      )}

      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {notifications.slice(0, compact ? 5 : 15).map((n) => (
          <li
            key={n.id}
            onClick={() => !n.read_at && markRead(n.id)}
            className={`panel p-2 text-xs cursor-pointer ${!n.read_at ? "border-primary/30 bg-primary/5" : "opacity-70"}`}
          >
            <div className="flex items-start gap-2">
              <Bell className={`h-3 w-3 shrink-0 mt-0.5 ${!n.read_at ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-muted-foreground">{n.body}</p>}
                <p className="text-[9px] text-muted-foreground/70 mt-0.5">{new Date(n.created_at).toLocaleString("it-IT")}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
