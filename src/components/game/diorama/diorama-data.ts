import type { BiomeKey } from "@/types/secretPikmin";

export type BuildingKey =
  | "centro_controllo"
  | "magazzino"
  | "accademia"
  | "laboratorio"
  | "mercato"
  | "hangar";

export interface DioramaBuildingDef {
  key: BuildingKey;
  name: string;
  emoji: string;
  role: string;
  requirement: string;
  /** % position on isometric plane */
  x: number;
  y: number;
  z: number;
  route?: string;
  action?: "ship";
  color: string;
}

export const DIORAMA_BUILDINGS: DioramaBuildingDef[] = [
  { key: "hangar", name: "Hangar Navicella", emoji: "🚀", role: "Area riparazioni", requirement: "Recupera pezzi navicella", x: 50, y: 20, z: 28, action: "ship", color: "#38bdf8" },
  { key: "laboratorio", name: "Laboratorio", emoji: "🔬", role: "Ricerca e analisi", requirement: "Centro Controllo Lv2", x: 28, y: 42, z: 40, route: "/lab", color: "#f472b6" },
  { key: "centro_controllo", name: "Centro di Controllo", emoji: "🎛️", role: "Capsula comando", requirement: "Base iniziale", x: 50, y: 46, z: 52, route: "/base", color: "#4ade80" },
  { key: "mercato", name: "Mercato", emoji: "🏪", role: "Scambi locali", requirement: "Magazzino Lv2", x: 72, y: 42, z: 42, route: "/villaggio/scambi", color: "#fb923c" },
  { key: "magazzino", name: "Magazzino", emoji: "📦", role: "Deposito provvisorio", requirement: "Materiali base", x: 30, y: 68, z: 62, route: "/inventario", color: "#a78bfa" },
  { key: "accademia", name: "Accademia Pikmin", emoji: "🎓", role: "Addestramento", requirement: "Colonia stabile", x: 70, y: 68, z: 64, route: "/archivio", color: "#fbbf24" },
];

export interface BiomeTheme {
  sky: string;
  ground: string;
  groundMid: string;
  groundDark: string;
  path: string;
  water?: string;
  accent: string;
  decor: string[];
}

export const BIOME_DIORAMA_THEMES: Record<BiomeKey, BiomeTheme> = {
  bosco: {
    sky: "linear-gradient(180deg,#1a3a2a 0%,#0f1f18 60%,#0a1410 100%)",
    ground: "#3d7a4a",
    groundMid: "#2d5c38",
    groundDark: "#1e3d26",
    path: "#c4a574",
    accent: "#86efac",
    decor: ["🌲", "🌳", "🍄", "🌿", "🦋"],
  },
  giardino: {
    sky: "linear-gradient(180deg,#3a2a5a 0%,#1a1028 70%)",
    ground: "#5a8a3a",
    groundMid: "#4a7030",
    groundDark: "#3a5528",
    path: "#e8c878",
    accent: "#fde047",
    decor: ["🌸", "🌻", "🌷", "🐝", "🌿"],
  },
  acqua: {
    sky: "linear-gradient(180deg,#1a3a5a 0%,#0a1a2a 70%)",
    ground: "#2a6a8a",
    groundMid: "#1e5068",
    groundDark: "#143848",
    path: "#a8d8ea",
    water: "rgba(56,189,248,0.45)",
    accent: "#7dd3fc",
    decor: ["💧", "🐚", "🌊", "🪷", "🐟"],
  },
  roccia: {
    sky: "linear-gradient(180deg,#2a2a3a 0%,#12121a 70%)",
    ground: "#6a6a5a",
    groundMid: "#525248",
    groundDark: "#3a3a32",
    path: "#9a9080",
    accent: "#d4d4d8",
    decor: ["🪨", "⛰️", "💎", "🦎", "🌵"],
  },
  grotta: {
    sky: "linear-gradient(180deg,#1a1028 0%,#080510 70%)",
    ground: "#4a3a5a",
    groundMid: "#3a2a48",
    groundDark: "#2a1a38",
    path: "#8a7a9a",
    accent: "#c084fc",
    decor: ["✨", "🔮", "🦇", "💜", "🪨"],
  },
  campo: {
    sky: "linear-gradient(180deg,#4a6a8a 0%,#1a2840 70%)",
    ground: "#8a9a4a",
    groundMid: "#6a7a38",
    groundDark: "#4a5a28",
    path: "#d4b878",
    accent: "#bef264",
    decor: ["🌾", "🌻", "☁️", "🐦", "🍃"],
  },
  citta: {
    sky: "linear-gradient(180deg,#3a3a4a 0%,#1a1a22 70%)",
    ground: "#5a5a62",
    groundMid: "#484850",
    groundDark: "#363640",
    path: "#888890",
    accent: "#94a3b8",
    decor: ["🏙️", "🚦", "🌳", "⭐", "💡"],
  },
  industriale: {
    sky: "linear-gradient(180deg,#2a2820 0%,#121110 70%)",
    ground: "#5a5048",
    groundMid: "#484038",
    groundDark: "#363028",
    path: "#707068",
    accent: "#fbbf24",
    decor: ["⚙️", "🔩", "🏭", "💨", "🔋"],
  },
};

export const PIKMIN_TYPE_TO_SPRITE: Record<string, string> = {
  rosso: "red",
  blu: "blue",
  giallo: "yellow",
  viola: "purple",
  bianco: "white",
  roccia: "rock",
  alato: "wing",
  gghiaccio: "white",
  ghiaccio: "white",
  luminoso: "white",
};

export function statusToAnimation(status: string, spec?: string): "walk" | "run" | "carry" | "work" | "idle" | "sleep" {
  if (status === "in_spedizione") return "run";
  if (status === "in_missione") return "run";
  if (status === "addestramento") return "work";
  if (status === "ferito") return "sleep";
  if (spec === "trasporto" || spec === "raccolta") return "carry";
  if (spec === "ricerca") return "work";
  if (spec === "combattimento") return "work";
  if (status === "disponibile") return "walk";
  return "idle";
}

export function statusToRoleLabel(status: string, spec?: string): string {
  if (status === "in_spedizione") return "Spedizione";
  if (status === "in_missione") return "Missione";
  if (status === "addestramento") return "Allenamento";
  if (spec === "raccolta") return "Raccolta";
  if (spec === "trasporto") return "Trasporto";
  if (spec === "ricerca") return "Ricerca";
  if (spec === "combattimento") return "Studio mostri";
  return "Pattuglia";
}

/** Pikmin wander paths (% x,y) */
export const PIKMIN_PATROL_POINTS = [
  { x: 35, y: 55 },
  { x: 45, y: 48 },
  { x: 55, y: 58 },
  { x: 42, y: 65 },
  { x: 50, y: 52 },
];
