import { useEffect, useRef, type MutableRefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { BaseRow, BaseBuilding } from "@/lib/base";
import { offsetMeters } from "@/lib/geo/distance";
import { escapeHtml } from "@/lib/escape";

interface WallSeg {
  id: string;
  from_x: number;
  from_y: number;
  to_x: number;
  to_y: number;
  level: number;
  material: string;
}

interface Props {
  mapRef: MutableRefObject<unknown | null>;
  ready: boolean;
  base: BaseRow & { base_name?: string; village_level?: number } | null;
  buildings: BaseBuilding[];
  walls: WallSeg[];
  show: boolean;
  showStructures?: boolean;
}

const FACTION_EMOJI: Record<string, string> = {
  eco: "🌿",
  tech: "⚡",
  battle: "⚔️",
  mystic: "🔮",
};
const FACTION_COLOR: Record<string, string> = {
  eco: "#5fd28b",
  tech: "#7ec0ff",
  battle: "#ff7777",
  mystic: "#c98cff",
};

// Scala il sistema griglia villaggio (0..100) sulla mappa: ~100m di lato.
const GRID_SPAN_METERS = 100;

function gridToOffset(x: number, y: number) {
  // x,y in 0..100 → -50..+50 metri
  const dx = ((x - 50) / 50) * (GRID_SPAN_METERS / 2);
  const dy = -((y - 50) / 50) * (GRID_SPAN_METERS / 2);
  return { dx, dy };
}

const BUILDING_EMOJI: Record<string, string> = {
  greenhouse: "🌱",
  reactor: "🔋",
  defense_tower: "🗼",
  radar_station: "📡",
  workshop: "🛠️",
  warehouse: "📦",
  barracks: "🏚️",
  altar: "🕯️",
};

export function VillageMapMarker({
  mapRef,
  ready,
  base,
  buildings,
  walls,
  show,
  showStructures = true,
}: Props) {
  const navigate = useNavigate();
  const villageMarkerRef = useRef<any>(null);
  const buildingMarkersRef = useRef<Map<string, any>>(new Map());
  const wallLinesRef = useRef<Map<string, any>>(new Map());

  // Marker principale villaggio
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!map) return;
      if (!base || base.lat == null || base.lng == null || !show) {
        if (villageMarkerRef.current) {
          map.removeLayer(villageMarkerRef.current);
          villageMarkerRef.current = null;
        }
        return;
      }
      const faction = (base.faction ?? "eco") as string;
      const emoji = FACTION_EMOJI[faction] ?? "🏕️";
      const color = FACTION_COLOR[faction] ?? "#5fd28b";
      const name = escapeHtml(base.base_name ?? base.name ?? "Campo Base");
      const level = base.level ?? 1;
      const html = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;transform:translateY(-4px)">
        <div style="background:#0a0a0a;color:${color};font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;border:1px solid ${color};box-shadow:0 0 10px ${color}">🏕️ ${name} · Lv ${level}</div>
        <div style="font-size:34px;line-height:1;filter:drop-shadow(0 0 12px ${color})">${emoji}</div>
      </div>`;
      const icon = L.divIcon({ className: "", html, iconSize: [140, 60], iconAnchor: [70, 34] });
      if (villageMarkerRef.current) {
        villageMarkerRef.current.setLatLng([base.lat, base.lng]).setIcon(icon);
      } else {
        villageMarkerRef.current = L.marker([base.lat, base.lng], { icon, zIndexOffset: 1100 }).addTo(map);
        villageMarkerRef.current.on("click", () => {
          navigate({ to: "/villaggio" });
        });
        villageMarkerRef.current.bindPopup(
          `<div style="min-width:160px"><b>${emoji} ${name}</b><br/><span style="opacity:.7">Livello ${level} · ${faction}</span><br/><span style="opacity:.7">Tocca per aprire il villaggio</span></div>`,
        );
      }
    })();
  }, [ready, mapRef, base?.lat, base?.lng, base?.base_name, base?.name, base?.level, base?.faction, show, navigate]);

  // Strutture: edifici + mura disegnati attorno al campo base
  useEffect(() => {
    if (!ready) return;
    (async () => {
      const L = await import("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!map) return;
      const center = base && base.lat != null && base.lng != null ? { lat: base.lat, lng: base.lng } : null;

      // Pulisci se nascosto / senza base
      if (!center || !show || !showStructures) {
        for (const [, m] of buildingMarkersRef.current) map.removeLayer(m);
        buildingMarkersRef.current.clear();
        for (const [, w] of wallLinesRef.current) map.removeLayer(w);
        wallLinesRef.current.clear();
        return;
      }

      const seenB = new Set<string>();
      for (const b of buildings) {
        seenB.add(b.id);
        const { dx, dy } = gridToOffset(b.position_x, b.position_y);
        const pos = offsetMeters(center, dx, dy);
        const emoji = BUILDING_EMOJI[b.type] ?? "🏠";
        const existing = buildingMarkersRef.current.get(b.id);
        if (existing) {
          existing.setLatLng([pos.lat, pos.lng]);
        } else {
          const html = `<div style="font-size:20px;line-height:1;filter:drop-shadow(0 0 6px #ffffff66)">${emoji}<sub style="font-size:8px;color:#fff;background:#0008;padding:0 2px;border-radius:3px;margin-left:-2px">${b.level}</sub></div>`;
          const icon = L.divIcon({ className: "", html, iconSize: [28, 24], iconAnchor: [14, 12] });
          const m = L.marker([pos.lat, pos.lng], { icon, zIndexOffset: 700 }).addTo(map);
          m.bindPopup(`<b>${emoji} ${escapeHtml(b.type)}</b><br/>Livello ${b.level}`);
          buildingMarkersRef.current.set(b.id, m);
        }
      }
      for (const [id, m] of buildingMarkersRef.current) {
        if (!seenB.has(id)) {
          map.removeLayer(m);
          buildingMarkersRef.current.delete(id);
        }
      }

      const seenW = new Set<string>();
      for (const w of walls) {
        seenW.add(w.id);
        const a = gridToOffset(w.from_x, w.from_y);
        const c = gridToOffset(w.to_x, w.to_y);
        const p1 = offsetMeters(center, a.dx, a.dy);
        const p2 = offsetMeters(center, c.dx, c.dy);
        const color = w.material === "crystal" ? "#a78bfa" : w.material === "tech" ? "#7ec0ff" : w.material === "stone" ? "#9ca3af" : "#a16207";
        const existing = wallLinesRef.current.get(w.id);
        if (existing) {
          existing.setLatLngs([[p1.lat, p1.lng], [p2.lat, p2.lng]]);
        } else {
          const line = L.polyline([[p1.lat, p1.lng], [p2.lat, p2.lng]], {
            color,
            weight: 3 + (w.level - 1),
            opacity: 0.85,
          }).addTo(map);
          wallLinesRef.current.set(w.id, line);
        }
      }
      for (const [id, line] of wallLinesRef.current) {
        if (!seenW.has(id)) {
          map.removeLayer(line);
          wallLinesRef.current.delete(id);
        }
      }
    })();
  }, [ready, mapRef, base?.lat, base?.lng, buildings, walls, show, showStructures]);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = mapRef.current as any;
      if (!map) return;
      if (villageMarkerRef.current) map.removeLayer(villageMarkerRef.current);
      for (const [, m] of buildingMarkersRef.current) map.removeLayer(m);
      for (const [, w] of wallLinesRef.current) map.removeLayer(w);
      buildingMarkersRef.current.clear();
      wallLinesRef.current.clear();
    };
  }, [mapRef]);

  return null;
}
