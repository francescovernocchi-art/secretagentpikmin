import { useEffect, useRef, type MutableRefObject } from "react";
import { PLAYER_ATTACK_RADIUS } from "@/lib/map/radiusRules";

interface Props {
  mapRef: MutableRefObject<unknown | null>;
  ready: boolean;
  me: { lat: number; lng: number } | null;
  show: boolean;
}

/** Cerchio 200m attorno al giocatore: raggio d'attacco diretto. */
export function PlayerRadiusLayer({ mapRef, ready, me, show }: Props) {
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!map) return;
      if (!me || !show) {
        if (ref.current) { map.removeLayer(ref.current); ref.current = null; }
        return;
      }
      if (!ref.current) {
        ref.current = L.circle([me.lat, me.lng], {
          radius: PLAYER_ATTACK_RADIUS,
          color: "oklch(0.86 0.24 145)",
          weight: 1,
          opacity: 0.4,
          fillOpacity: 0.04,
          dashArray: "1 6",
        }).addTo(map);
      } else {
        ref.current.setLatLng([me.lat, me.lng]);
      }
    })();
  }, [ready, mapRef, me?.lat, me?.lng, show]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (map && ref.current) map.removeLayer(ref.current);
    };
  }, [mapRef]);

  return null;
}
