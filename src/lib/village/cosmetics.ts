import { supabase } from "@/integrations/supabase/client";

export type GroundPattern = "liscio" | "erba" | "esagoni" | "rune" | "circuito" | "sabbia";
export type PikminAccessory = "nessuno" | "foglia" | "fiore" | "cappello" | "elmo" | "stella" | "antenna";
export type PikminAura = "nessuna" | "soffice" | "neon" | "scintille" | "ombra";

export interface VillageCosmetics {
  skyTop: string;
  skyBottom: string;
  groundColor: string;
  accentColor: string;
  pattern: GroundPattern;
  pikminBody: string;
  pikminAccessory: PikminAccessory;
  pikminAura: PikminAura;
  villageName?: string;
}

export const DEFAULT_COSMETICS: VillageCosmetics = {
  skyTop: "#7ec8a8",
  skyBottom: "#3d6b4d",
  groundColor: "#3d6b4d",
  accentColor: "#a8e063",
  pattern: "erba",
  pikminBody: "#7be07b",
  pikminAccessory: "foglia",
  pikminAura: "soffice",
};

export const COSMETIC_PRESETS: Record<string, Partial<VillageCosmetics> & { label: string; emoji: string }> = {
  bosco: {
    label: "Bosco antico",
    emoji: "🌳",
    skyTop: "#9fd9b8",
    skyBottom: "#2f5a3f",
    groundColor: "#2f5a3f",
    accentColor: "#bef264",
    pattern: "erba",
    pikminBody: "#7be07b",
    pikminAccessory: "foglia",
    pikminAura: "soffice",
  },
  oasi: {
    label: "Oasi cristallo",
    emoji: "💎",
    skyTop: "#a5f3fc",
    skyBottom: "#0e7490",
    groundColor: "#155e75",
    accentColor: "#67e8f9",
    pattern: "esagoni",
    pikminBody: "#7dd3fc",
    pikminAccessory: "stella",
    pikminAura: "neon",
  },
  deserto: {
    label: "Dune dorate",
    emoji: "🏜️",
    skyTop: "#fde68a",
    skyBottom: "#b45309",
    groundColor: "#a87241",
    accentColor: "#fbbf24",
    pattern: "sabbia",
    pikminBody: "#fbbf24",
    pikminAccessory: "cappello",
    pikminAura: "scintille",
  },
  vulcano: {
    label: "Forgia ardente",
    emoji: "🔥",
    skyTop: "#fca5a5",
    skyBottom: "#7f1d1d",
    groundColor: "#450a0a",
    accentColor: "#f97316",
    pattern: "rune",
    pikminBody: "#f97316",
    pikminAccessory: "elmo",
    pikminAura: "scintille",
  },
  arcano: {
    label: "Bosco arcano",
    emoji: "🔮",
    skyTop: "#c4b5fd",
    skyBottom: "#312e81",
    groundColor: "#1e1b4b",
    accentColor: "#e879f9",
    pattern: "rune",
    pikminBody: "#c084fc",
    pikminAccessory: "fiore",
    pikminAura: "neon",
  },
  cyber: {
    label: "Griglia cyber",
    emoji: "🤖",
    skyTop: "#67e8f9",
    skyBottom: "#0c4a6e",
    groundColor: "#082f49",
    accentColor: "#22d3ee",
    pattern: "circuito",
    pikminBody: "#22d3ee",
    pikminAccessory: "antenna",
    pikminAura: "neon",
  },
  artico: {
    label: "Tundra polare",
    emoji: "❄️",
    skyTop: "#e0f2fe",
    skyBottom: "#475569",
    groundColor: "#cbd5e1",
    accentColor: "#7dd3fc",
    pattern: "liscio",
    pikminBody: "#e0f2fe",
    pikminAccessory: "elmo",
    pikminAura: "soffice",
  },
};

export function getCosmetics(layout: Record<string, unknown> | null | undefined): VillageCosmetics {
  const raw = (layout?.["cosmetics"] as Partial<VillageCosmetics> | undefined) ?? {};
  return { ...DEFAULT_COSMETICS, ...raw };
}

export async function saveCosmetics(agent: string, cosmetics: VillageCosmetics) {
  const { data: cur } = await supabase.from("bases").select("layout").eq("agent", agent).maybeSingle();
  const layout = { ...((cur?.layout as Record<string, unknown>) ?? {}), cosmetics };
  await supabase.from("bases").update({ layout, updated_at: new Date().toISOString() }).eq("agent", agent);
  await supabase.from("base_events").insert({
    agent,
    type: "cosmetics_updated",
    payload: { preset: cosmetics.pattern, accessory: cosmetics.pikminAccessory },
  });
}

export function patternBackground(pattern: GroundPattern, accent: string): string {
  switch (pattern) {
    case "esagoni":
      return `radial-gradient(${accent}55 1px, transparent 1.5px) 0 0/14px 14px`;
    case "rune":
      return `repeating-linear-gradient(45deg, ${accent}33 0 2px, transparent 2px 10px)`;
    case "circuito":
      return `linear-gradient(90deg, ${accent}33 1px, transparent 1px) 0 0/18px 18px,
              linear-gradient(0deg, ${accent}33 1px, transparent 1px) 0 0/18px 18px`;
    case "sabbia":
      return `radial-gradient(${accent}44 1px, transparent 2px) 0 0/8px 8px`;
    case "erba":
      return `repeating-linear-gradient(90deg, ${accent}22 0 3px, transparent 3px 9px)`;
    case "liscio":
    default:
      return "transparent";
  }
}
