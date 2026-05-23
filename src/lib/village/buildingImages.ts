import { supabase } from "@/integrations/supabase/client";

/** Cache delle immagini delle strutture caricate dall'admin (catalogo). */
export interface BuildingImageSet {
  base: string | null;
  stages: (string | null)[]; // 5 slot, uno per livello
}

let cache: Map<string, BuildingImageSet> | null = null;
let inflight: Promise<Map<string, BuildingImageSet>> | null = null;
const listeners = new Set<() => void>();

export function invalidateBuildingImagesCache() {
  cache = null;
  inflight = null;
  listeners.forEach((l) => l());
}

export function subscribeBuildingImages(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function loadBuildingImages(): Promise<Map<string, BuildingImageSet>> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from("building_catalog")
      .select("key,image_url,visual_stages");
    const map = new Map<string, BuildingImageSet>();
    (data ?? []).forEach((r: any) => {
      const stagesRaw = Array.isArray(r.visual_stages) ? r.visual_stages : [];
      const stages: (string | null)[] = [0, 1, 2, 3, 4].map((i) => {
        const v = stagesRaw[i];
        return typeof v === "string" && v.length > 0 ? v : null;
      });
      map.set(r.key, { base: r.image_url ?? null, stages });
    });
    cache = map;
    inflight = null;
    return map;
  })();
  return inflight;
}

/** Restituisce l'URL dell'immagine per (tipo, livello), preferendo lo stage specifico,
 * poi l'immagine base. Null se non disponibile. */
export function pickBuildingImage(set: BuildingImageSet | undefined, level: number): string | null {
  if (!set) return null;
  const idx = Math.max(0, Math.min(4, level - 1));
  return set.stages[idx] || set.base || null;
}
