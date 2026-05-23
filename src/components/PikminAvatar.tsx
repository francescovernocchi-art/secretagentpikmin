import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cache in-memory delle specie pikmin: ogni componente che mostra un pikmin
 * deve SEMPRE leggere immagine e info da qui (dalla scheda della specie),
 * mai con asset hard-coded. L'admin carica le immagini in /admin.
 */
interface SpeciesLite {
  key: string;
  name: string;
  color: string | null;
  image_url: string | null;
  abilities: string[] | null;
}

let CACHE: Map<string, SpeciesLite> | null = null;
let LOADING: Promise<Map<string, SpeciesLite>> | null = null;

async function loadSpecies(): Promise<Map<string, SpeciesLite>> {
  if (CACHE) return CACHE;
  if (LOADING) return LOADING;
  LOADING = supabase
    .from("pikmin_species")
    .select("key,name,color,image_url,abilities")
    .then(({ data }) => {
      CACHE = new Map((data ?? []).map((r: any) => [r.key, r as SpeciesLite]));
      return CACHE;
    });
  return LOADING;
}

export function invalidatePikminCache() {
  CACHE = null;
  LOADING = null;
}

export function usePikminSpecies(speciesKey: string | null | undefined): SpeciesLite | null {
  const [s, setS] = useState<SpeciesLite | null>(null);
  useEffect(() => {
    if (!speciesKey) { setS(null); return; }
    let active = true;
    loadSpecies().then((m) => { if (active) setS(m.get(speciesKey) ?? null); });
    return () => { active = false; };
  }, [speciesKey]);
  return s;
}

interface Props {
  speciesKey: string;
  size?: number;
  className?: string;
  fallbackEmoji?: string;
}

export function PikminAvatar({ speciesKey, size = 32, fallbackEmoji = "🌱", className = "" }: Props) {
  const s = usePikminSpecies(speciesKey);
  const style = { width: size, height: size };
  if (s?.image_url) {
    return (
      <img
        src={s.image_url}
        alt={s.name}
        style={style}
        className={`object-contain ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: size * 0.85, lineHeight: 1, color: s?.color ?? undefined }}
      className={`inline-flex items-center justify-center ${className}`}
      title={s?.name ?? speciesKey}
    >
      {fallbackEmoji}
    </span>
  );
}
