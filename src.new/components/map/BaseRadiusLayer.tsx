import { useEffect, useRef, type MutableRefObject } from "react";

interface Props {
  mapRef: MutableRefObject<unknown | null>;
  ready: boolean;
  center: { lat: number; lng: number } | null;
  actionRadius: number;
  threatRadius: number;
  show: boolean;
}

/** Disegna due cerchi attorno al Campo Base: raggio d'azione e raggio di minaccia. */
export function BaseRadiusLayer({ mapRef, ready, center, actionRadius, threatRadius, show }: Props) {
  const actionRef = useRef<any>(null);
  const threatRef = useRef<any>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!map) return;
      if (!center || !show) {
        if (actionRef.current) { map.removeLayer(actionRef.current); actionRef.current = null; }
        if (threatRef.current) { map.removeLayer(threatRef.current); threatRef.current = null; }
        return;
      }
      if (!actionRef.current) {
        actionRef.current = L.circle([center.lat, center.lng], {
          radius: actionRadius,
          color: "oklch(0.78 0.18 200)",
          weight: 1.5,
          opacity: 0.6,
          fillOpacity: 0.05,
          dashArray: "4 6",
        }).addTo(map);
      } else {
        actionRef.current.setLatLng([center.lat, center.lng]).setRadius(actionRadius);
      }
      if (!threatRef.current) {
        threatRef.current = L.circle([center.lat, center.lng], {
          radius: threatRadius,
          color: "#f97316",
          weight: 1.2,
          opacity: 0.55,
          fillOpacity: 0.04,
          dashArray: "2 6",
        }).addTo(map);
      } else {
        threatRef.current.setLatLng([center.lat, center.lng]).setRadius(threatRadius);
      }
    })();
  }, [ready, mapRef, center?.lat, center?.lng, actionRadius, threatRadius, show]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!map) return;
      if (actionRef.current) map.removeLayer(actionRef.current);
      if (threatRef.current) map.removeLayer(threatRef.current);
    };
  }, [mapRef]);

  return null;
}
