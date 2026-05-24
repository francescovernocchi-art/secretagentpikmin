// Sistema biomi villaggio "oggetti giganti" - Secret Agent Pikmin
import foresta from "@/assets/biomes/foresta.jpg";
import roccioso from "@/assets/biomes/roccioso.jpg";
import litorale from "@/assets/biomes/litorale.jpg";
import montanaro from "@/assets/biomes/montanaro.jpg";
import vulcanico from "@/assets/biomes/vulcanico.jpg";
import industriale from "@/assets/biomes/industriale.jpg";
import spaziale from "@/assets/biomes/spaziale.jpg";
import desertico from "@/assets/biomes/desertico.jpg";

export type BiomeKey =
  | "foresta"
  | "roccioso"
  | "litorale"
  | "montanaro"
  | "vulcanico"
  | "industriale"
  | "spaziale"
  | "desertico";

export interface BiomeConfig {
  key: BiomeKey;
  label: string;
  emoji: string;
  image: string;
  tagline: string;
  bonuses: string[]; // brevi etichette UI
  accent: string;
}

export const BIOMES: Record<BiomeKey, BiomeConfig> = {
  foresta:     { key: "foresta",     label: "Foresta",     emoji: "🌿", image: foresta,     tagline: "Lattine, ghiande e foglie giganti",      bonuses: ["Crescita Pikmin", "Raccolta Risorse", "Rigenerazione"], accent: "#7cd99a" },
  roccioso:    { key: "roccioso",    label: "Roccioso",    emoji: "🪨", image: roccioso,    tagline: "Lattine e cristalli tra le rocce",        bonuses: ["Difesa", "Resistenza", "Estrazione"],                   accent: "#a8a29e" },
  litorale:    { key: "litorale",    label: "Litorale",    emoji: "🌊", image: litorale,    tagline: "Bottiglie-faro e capanne di conchiglia",  bonuses: ["Pesca", "Nettare Marino", "Velocità"],                  accent: "#7ec0e8" },
  montanaro:   { key: "montanaro",   label: "Montanaro",   emoji: "⛰️", image: montanaro,   tagline: "Tazza fumante e thermos sulla neve",      bonuses: ["Resistenza Freddo", "Vista Lontana", "Energia"],        accent: "#cbd5e1" },
  vulcanico:   { key: "vulcanico",   label: "Vulcanico",   emoji: "🔥", image: vulcanico,   tagline: "Accendini e fiammiferi nella lava",       bonuses: ["Produzione Calore", "Attacco", "Velocità Costruzione"], accent: "#fb923c" },
  industriale: { key: "industriale", label: "Industriale", emoji: "⚙️", image: industriale, tagline: "Barattoli di vernice e batterie",         bonuses: ["Automazione", "Produzione Avanzata", "Droni"],          accent: "#c084fc" },
  spaziale:    { key: "spaziale",    label: "Spaziale",    emoji: "🚀", image: spaziale,    tagline: "Bombolette razzo e cupole su crateri",    bonuses: ["Esplorazione", "Scoperte Rare", "Eventi Speciali"],     accent: "#67e8f9" },
  desertico:   { key: "desertico",   label: "Desertico",   emoji: "🌵", image: desertico,   tagline: "Cactus, vasi terracotta e dune",          bonuses: ["Resistenza Calore", "Raccolta Rara", "Viaggio Veloce"], accent: "#fbbf24" },
};

export const BIOME_LIST = Object.values(BIOMES);

/** Mappa retrocompatibile temi vecchi → nuovi biomi. */
export function resolveBiome(theme: string | null | undefined): BiomeConfig {
  if (!theme) return BIOMES.foresta;
  const direct = BIOMES[theme as BiomeKey];
  if (direct) return direct;
  const legacy: Record<string, BiomeKey> = {
    lago: "litorale",
    deserto: "desertico",
    notte: "spaziale",
  };
  const mapped = legacy[theme];
  return mapped ? BIOMES[mapped] : BIOMES.foresta;
}
