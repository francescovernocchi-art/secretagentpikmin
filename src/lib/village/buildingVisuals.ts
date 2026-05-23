// Visual mapping per ogni tipo di edificio × livello (1→5).
// Codice in inglese, testi in italiano per UI.

export interface BuildingVisual {
  /** Italian display name shown in UI. */
  nameIt: string;
  /** Italian short description. */
  descriptionIt: string;
  /** Emoji sprite per livello (index 0 = lv1, 4 = lv5/legendary). */
  sprites: [string, string, string, string, string];
  /** Accent color (CSS). */
  accent: string;
  /** Glow color for high levels. */
  glow: string;
  /** Footprint size in vw units. */
  size: number;
}

// Mapping flessibile: chiavi che NON esistono nel DB cadono nel fallback.
export const BUILDING_VISUALS: Record<string, BuildingVisual> = {
  command_center: {
    nameIt: "Centro Comando",
    descriptionIt: "Cuore strategico del villaggio.",
    sprites: ["🛖", "🏠", "🏛️", "🏯", "🏰"],
    accent: "#fbbf24",
    glow: "#fde68a",
    size: 12,
  },
  pikmin_greenhouse: {
    nameIt: "Serra Pikmin",
    descriptionIt: "Crescita accelerata dei Pikmin.",
    sprites: ["🌱", "🪴", "🌿", "🌳", "🌺"],
    accent: "#7be07b",
    glow: "#b8f5a0",
    size: 10,
  },
  research_lab: {
    nameIt: "Laboratorio",
    descriptionIt: "Sblocca ricette e gadget.",
    sprites: ["⚗️", "🧪", "🔬", "🧬", "🛸"],
    accent: "#a78bfa",
    glow: "#e9d5ff",
    size: 10,
  },
  energy_reactor: {
    nameIt: "Reattore",
    descriptionIt: "Energia massima del villaggio.",
    sprites: ["🔋", "⚡", "🔆", "☢️", "🌟"],
    accent: "#facc15",
    glow: "#fef08a",
    size: 10,
  },
  storage: {
    nameIt: "Deposito",
    descriptionIt: "Capacità risorse aumentata.",
    sprites: ["📦", "🗄️", "🏚️", "🏭", "🏬"],
    accent: "#94a3b8",
    glow: "#cbd5e1",
    size: 10,
  },
  defense_tower: {
    nameIt: "Torre di Difesa",
    descriptionIt: "Protegge dalle minacce vicine.",
    sprites: ["🗼", "🏰", "🛡️", "⚔️", "🔱"],
    accent: "#fb7185",
    glow: "#fda4af",
    size: 9,
  },
  training_camp: {
    nameIt: "Campo Addestramento",
    descriptionIt: "Squadre più efficaci in battaglia.",
    sprites: ["⛺", "🎯", "🥋", "🏟️", "🏛️"],
    accent: "#fb923c",
    glow: "#fdba74",
    size: 11,
  },
  workshop: {
    nameIt: "Officina",
    descriptionIt: "Velocizza la costruzione.",
    sprites: ["🔧", "🛠️", "⚙️", "🏗️", "🤖"],
    accent: "#f59e0b",
    glow: "#fcd34d",
    size: 10,
  },
  radar_station: {
    nameIt: "Stazione Radar",
    descriptionIt: "Rileva mostri e pezzi di navicella.",
    sprites: ["📡", "🛰️", "🗼", "🌐", "🛸"],
    accent: "#7dd3fc",
    glow: "#bae6fd",
    size: 9,
  },
  medical_station: {
    nameIt: "Infermeria",
    descriptionIt: "Cura i Pikmin di ritorno.",
    sprites: ["⛑️", "🏥", "💊", "🧬", "✨"],
    accent: "#fca5a5",
    glow: "#fecaca",
    size: 10,
  },
  mission_hangar: {
    nameIt: "Hangar Missioni",
    descriptionIt: "Bonus alle spedizioni partenti.",
    sprites: ["🚪", "🏚️", "🏭", "🚀", "🛸"],
    accent: "#60a5fa",
    glow: "#bfdbfe",
    size: 11,
  },
  pikmin_pen: {
    nameIt: "Recinto Pikmin",
    descriptionIt: "Capacità massima Pikmin.",
    sprites: ["🌾", "🍀", "🌳", "🏞️", "🌈"],
    accent: "#a3e635",
    glow: "#d9f99d",
    size: 11,
  },
  drone_factory: {
    nameIt: "Fabbrica Droni",
    descriptionIt: "Produce droni di supporto.",
    sprites: ["🪛", "🤖", "🛸", "🚁", "🛰️"],
    accent: "#22d3ee",
    glow: "#a5f3fc",
    size: 10,
  },
  gadget_lab: {
    nameIt: "Lab Gadget",
    descriptionIt: "Sblocca strumenti speciali.",
    sprites: ["💡", "🔮", "📿", "🧿", "🛸"],
    accent: "#c084fc",
    glow: "#f0abfc",
    size: 9,
  },
};

const FALLBACK: BuildingVisual = {
  nameIt: "Struttura",
  descriptionIt: "Edificio del villaggio.",
  sprites: ["🛖", "🏠", "🏯", "🏰", "🏛️"],
  accent: "#94a3b8",
  glow: "#e2e8f0",
  size: 10,
};

export function visualFor(type: string): BuildingVisual {
  return BUILDING_VISUALS[type] ?? FALLBACK;
}

export function spriteFor(type: string, level: number): string {
  const v = visualFor(type);
  const idx = Math.max(0, Math.min(4, level - 1));
  return v.sprites[idx];
}

export function evolutionStageLabel(level: number): string {
  if (level >= 5) return "Leggendario";
  if (level >= 4) return "Evoluto";
  if (level >= 3) return "Avanzato";
  if (level >= 2) return "Migliorato";
  return "Base";
}
