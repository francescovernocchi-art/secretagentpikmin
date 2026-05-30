import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AudioAsset {
  id: string;
  key: string;
  name: string;
  url: string;
  kind: string;
  page: string | null;
  loop: boolean;
  volume: number;
  enabled: boolean;
}

const MUTE_KEY = "village.audio.muted";

/**
 * Player audio globale: riproduce musica/ambient assegnata alla pagina corrente
 * (campo `page` su audio_assets, es. "villaggio"). Se non esiste, prova "global".
 */
export function GlobalAudioPlayer() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [assets, setAssets] = useState<AudioAsset[]>([]);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTE_KEY) === "1";
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("audio_assets")
      .select("*")
      .eq("enabled", true)
      .then(({ data }) => { if (active) setAssets((data ?? []) as AudioAsset[]); });
    const ch = supabase
      .channel("audio_assets_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "audio_assets" }, () => {
        supabase.from("audio_assets").select("*").eq("enabled", true).then(({ data }) => setAssets((data ?? []) as AudioAsset[]));
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  // Trova traccia per la pagina corrente (sezione root, es. /villaggio → "villaggio")
  const section = path.split("/").filter(Boolean)[0] ?? "home";
  const track =
    assets.find((a) => a.kind === "music" && a.page === section) ??
    assets.find((a) => a.kind === "music" && (a.page === "global" || a.page === null));

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (muted || !track) {
      el.pause();
      return;
    }
    if (el.src !== track.url) {
      el.src = track.url;
      el.loop = track.loop;
    }
    el.volume = Math.max(0, Math.min(1, track.volume));
    el.play().catch(() => {/* autoplay blocked */});
  }, [track?.url, track?.loop, track?.volume, muted]);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  };

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      <button
        onClick={toggle}
        className="fixed bottom-24 right-3 z-40 panel-strong rounded-full p-2 active:scale-95 transition"
        title={muted ? "Attiva audio" : "Silenzia"}
        aria-label={muted ? "Attiva audio" : "Silenzia"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </>
  );
}
