import { useEffect, useState } from "react";
import { ParticleEffect, type ParticleVariant } from "@/components/fx/ParticleEffect";
import { GAME_FX_EVENT, type GameFxDetail } from "@/lib/game-event-fx";

interface Burst {
  id: number;
  variant: ParticleVariant;
}

export function EventFxLayer() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<GameFxDetail>).detail;
      if (!detail?.particle) return;
      const id = Date.now() + Math.random();
      setBursts((prev) => [...prev.slice(-3), { id, variant: detail.particle }]);
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 1400);
    };

    window.addEventListener(GAME_FX_EVENT, handler);
    return () => window.removeEventListener(GAME_FX_EVENT, handler);
  }, []);

  if (bursts.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998]" aria-hidden>
      {bursts.map((b) => (
        <ParticleEffect key={b.id} variant={b.variant} density="medium" className="opacity-75" />
      ))}
    </div>
  );
}
