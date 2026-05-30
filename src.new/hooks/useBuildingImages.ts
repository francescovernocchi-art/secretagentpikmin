import { useEffect, useState } from "react";
import {
  loadBuildingImages,
  subscribeBuildingImages,
  type BuildingImageSet,
} from "@/lib/village/buildingImages";

/** Hook che restituisce la mappa key→immagini (base + per livello) dal catalogo. */
export function useBuildingImages(): Map<string, BuildingImageSet> {
  const [map, setMap] = useState<Map<string, BuildingImageSet>>(new Map());

  useEffect(() => {
    let alive = true;
    loadBuildingImages().then((m) => alive && setMap(new Map(m)));
    const unsub = subscribeBuildingImages(() => {
      loadBuildingImages().then((m) => alive && setMap(new Map(m)));
    });
    return () => { alive = false; unsub(); };
  }, []);

  return map;
}
