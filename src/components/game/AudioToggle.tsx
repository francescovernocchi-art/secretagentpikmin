import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { gameAudio } from "@/lib/game-audio";
import { hapticTap } from "@/lib/haptic";

/** Toggle audio ON/OFF — persistito in localStorage */
export function AudioToggle({ compact = false }: { compact?: boolean }) {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(gameAudio.enabled());
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        hapticTap();
        const next = !on;
        gameAudio.setEnabled(next);
        setOn(next);
        if (next) gameAudio.play("ui_click");
      }}
      className={`panel flex items-center gap-1.5 ${compact ? "px-2 py-1.5" : "px-3 py-2"}`}
      aria-label={on ? "Disattiva suoni" : "Attiva suoni"}
      aria-pressed={on}
    >
      {on ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
      {!compact && (
        <span className="text-[10px] uppercase tracking-widest">{on ? "Audio ON" : "Audio OFF"}</span>
      )}
    </button>
  );
}
