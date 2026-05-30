import {
  Binoculars,
  BookOpen,
  Camera,
  Coins,
  Leaf,
  Map,
  Radar,
  Rocket,
  Shield,
  ShoppingBag,
  Sparkles,
  Sprout,
  Heart,
  Zap,
  Package,
  Wrench,
} from "lucide-react";
import type {
  BiomeDefinition,
  BiomeKey,
  ChatChannelKey,
  ChatQuickMessage,
  CoreMission,
  CoreMissionKey,
  DiscoverySummary,
  ExpeditionSummary,
  FamilyCommander,
  FamilyTradeOffer,
  GameIdentity,
  MarketListing,
  PikminSpecialization,
  PikminSpecializationKey,
  PikminTypeDefinition,
  PikminTypeKey,
  PikminUnit,
  PlanetState,
  ScannerTarget,
  ShipPartState,
  VillageBuildingDefinition,
} from "@/types/secretPikmin";

export type { CoreMissionKey, PikminSpecializationKey, PikminTypeKey, BiomeKey };

export const GAME_IDENTITY: GameIdentity = {
  title: "Secret Pikmin",
  subtitle: "Missione Famiglia",
  tagline: "Salvate il pianeta originario — insieme.",
  rule: "Francesco e Lorenzo sono Comandanti. Gli utenti non hanno classi: le specializzazioni appartengono ai Pikmin.",
};

export const FAMILY_COMMAND = {
  title: `${GAME_IDENTITY.title}: ${GAME_IDENTITY.subtitle}`,
  commander: "Francesco · Comandante",
  firstExplorer: "Lorenzo · Comandante",
  rule: GAME_IDENTITY.rule,
};

export const MAIN_NAV = [
  { to: "/base", label: "Home", emoji: "🏠" },
  { to: "/villaggio", label: "Villaggio", emoji: "🏘️" },
  { to: "/mappa", label: "Mappa", emoji: "🗺️" },
  { to: "/archivio", label: "Pikmin", emoji: "🌱" },
  { to: "/missioni", label: "Missioni", emoji: "🎯" },
  { to: "/nemici", label: "Bestiario", emoji: "👾" },
  { to: "/mercato", label: "Market", emoji: "🛒" },
  { to: "/chat", label: "Chat Segreta", emoji: "📡" },
  { to: "/profilo", label: "Profilo", emoji: "👤" },
] as const;

export const HIDDEN_ROUTES = [
  { to: "/radar", label: "Radar", parent: "mappa" },
  { to: "/spedizioni", label: "Spedizioni", parent: "missioni" },
  { to: "/navicella", label: "Navicella", parent: "missioni" },
  { to: "/inventario", label: "Inventario", parent: "home" },
  { to: "/lab", label: "Laboratorio", parent: "villaggio" },
  { to: "/ricette", label: "Ricette", parent: "villaggio" },
  { to: "/premi", label: "Premi", parent: "profilo" },
  { to: "/agenti", label: "Famiglia", parent: "profilo" },
  { to: "/ricordi", label: "Ricordi", parent: "profilo" },
  { to: "/admin", label: "Admin", parent: "profilo", admin: true },
  { to: "/atelier", label: "Atelier", parent: "profilo", admin: true },
  { to: "/villaggio/edifici", label: "Edifici", parent: "villaggio" },
  { to: "/villaggio/scambi", label: "Scambi", parent: "villaggio" },
  { to: "/villaggio/phaser", label: "Phaser RTS", parent: "villaggio" },
] as const;

/** Stato pianeta — mock strutturato come record Supabase futuro */
export const PLANET_STATE: PlanetState = {
  debtTotal: 10000,
  debtPaid: 2350,
  food: 68,
  energy: 54,
  morale: 72,
};

export const SHIP_PARTS: ShipPartState[] = [
  { key: "motore", name: "Motore ionico", emoji: "🔥", collected: true, locationHint: "Zona industriale" },
  { key: "antenna", name: "Antenna di comunicazione", emoji: "📡", collected: true, locationHint: "Campo aperto" },
  { key: "cabina", name: "Cabina di comando", emoji: "🛸", collected: false, locationHint: "Bosco antico" },
  { key: "modulo_energia", name: "Modulo energia", emoji: "⚡", collected: false, locationHint: "Grotta cristallina" },
  { key: "stabilizzatori", name: "Stabilizzatori", emoji: "🪽", collected: true, locationHint: "Giardino" },
  { key: "nucleo", name: "Nucleo centrale", emoji: "💎", collected: false, locationHint: "Anomalia spaziale" },
];

export const CORE_MISSIONS: CoreMission[] = [
  {
    key: "ship",
    title: "Ricostruzione Navicella",
    short: "Ricostruisci il razzo pezzo dopo pezzo.",
    description:
      "Ogni pezzo trovato sulla mappa, con radar o scanner aggiorna la navicella visiva: motore, antenna, cabina, modulo energia, stabilizzatori e nucleo centrale.",
    icon: Rocket,
    emoji: "🚀",
    progressLabel: "Pezzi recuperati",
    color: "from-cyan-400/25 to-blue-600/10",
    progress: SHIP_PARTS.filter((p) => p.collected).length,
    progressMax: SHIP_PARTS.length,
  },
  {
    key: "debt",
    title: "Estinzione Debito Planetario",
    short: "Vendi oggetti e reliquie al Market.",
    description:
      "Gli oggetti recuperati possono essere venduti nel Mercato Galattico. I crediti versati riducono il debito del pianeta originario.",
    icon: Coins,
    emoji: "🪙",
    progressLabel: "Crediti versati",
    color: "from-amber-300/25 to-orange-600/10",
    progress: PLANET_STATE.debtPaid,
    progressMax: PLANET_STATE.debtTotal,
  },
  {
    key: "planet",
    title: "Cibo ed Energia per il Pianeta",
    short: "Trasforma frutta, ingredienti e cristalli.",
    description:
      "Frutta e ingredienti nutrono il pianeta. Cristalli, batterie e scintille diventano energia. Il morale sale quando la famiglia collabora.",
    icon: Zap,
    emoji: "⚡",
    progressLabel: "Riserve pianeta",
    color: "from-lime-300/25 to-emerald-600/10",
    progress: Math.round((PLANET_STATE.food + PLANET_STATE.energy) / 2),
    progressMax: 100,
  },
  {
    key: "bestiary",
    title: "Bestiario e Classificazione",
    short: "Studia mostri e specie trovate.",
    description:
      "I Pikmin specializzati nello spionaggio osservano i mostri, trovano debolezze, abitudini, biomi preferiti e completano il bestiario.",
    icon: BookOpen,
    emoji: "📚",
    progressLabel: "Schede catalogate",
    color: "from-fuchsia-300/25 to-purple-600/10",
    progress: 12,
    progressMax: 48,
  },
];

export const PIKMIN_TYPES: PikminTypeDefinition[] = [
  { key: "rosso", label: "Rosso", emoji: "🔴", color: "#ef4444", predispositions: ["combattimento", "raccolta"], affinities: ["bosco", "campo"], notes: "Fuoco, assalto, difesa attiva" },
  { key: "blu", label: "Blu", emoji: "🔵", color: "#3b82f6", predispositions: ["raccolta", "scouting"], affinities: ["acqua", "giardino"], notes: "Acqua, recupero, esplorazione" },
  { key: "giallo", label: "Giallo", emoji: "🟡", color: "#eab308", predispositions: ["ricerca", "raccolta"], affinities: ["campo", "industriale"], notes: "Energia, tecnologia, ricerca" },
  { key: "viola", label: "Viola", emoji: "🟣", color: "#a855f7", predispositions: ["trasporto", "combattimento"], affinities: ["roccia", "grotta"], notes: "Forza, trasporto pesante" },
  { key: "bianco", label: "Bianco", emoji: "⚪", color: "#f8fafc", predispositions: ["spionaggio", "ricerca"], affinities: ["grotta", "citta"], notes: "Analisi, tossine, intelligence" },
  { key: "roccia", label: "Roccia", emoji: "🪨", color: "#78716c", predispositions: ["combattimento", "trasporto"], affinities: ["roccia", "industriale"], notes: "Demolizione, difesa, miniere" },
  { key: "alato", label: "Alato", emoji: "🪽", color: "#38bdf8", predispositions: ["scouting", "trasporto"], affinities: ["campo", "bosco"], notes: "Scouting, consegne rapide" },
  { key: "ghiaccio", label: "Ghiaccio", emoji: "❄️", color: "#67e8f9", predispositions: ["supporto", "raccolta"], affinities: ["grotta", "acqua"], notes: "Controllo, supporto squadra" },
  { key: "luminoso", label: "Luminoso", emoji: "✨", color: "#fde047", predispositions: ["ricerca", "spionaggio"], affinities: ["grotta", "industriale"], notes: "Anomalie, eventi rari (opzionale)" },
];

export const PIKMIN_SPECIALIZATIONS: PikminSpecialization[] = [
  {
    key: "raccolta",
    title: "Raccolta",
    icon: Leaf,
    emoji: "🍃",
    duties: ["frutta", "ingredienti", "minerali", "materiali naturali"],
    bonuses: ["più resa", "raccolta rapida", "meno energia consumata"],
    bestTypes: ["Rosso", "Giallo", "Ghiaccio"],
  },
  {
    key: "trasporto",
    title: "Trasporto",
    icon: ShoppingBag,
    emoji: "🎒",
    duties: ["pezzi pesanti", "merci", "materiali", "consegne"],
    bonuses: ["peso trasportabile", "consegna rapida", "meno Pikmin necessari"],
    bestTypes: ["Viola", "Roccia", "Alato"],
  },
  {
    key: "ricerca",
    title: "Ricerca oggetti rari",
    icon: Radar,
    emoji: "📡",
    duties: ["pezzi navicella", "reliquie", "oggetti rari", "anomalie"],
    bonuses: ["raggio radar", "drop raro", "tracce nascoste"],
    bestTypes: ["Giallo", "Alato", "Bianco"],
  },
  {
    key: "scouting",
    title: "Scouting e mappatura",
    icon: Map,
    emoji: "🗺️",
    duties: ["biomi", "punti sicuri", "percorsi", "nuovi villaggi"],
    bonuses: ["visibilità mappa", "spedizioni rapide", "rischio ridotto"],
    bestTypes: ["Alato", "Blu", "Giallo"],
  },
  {
    key: "spionaggio",
    title: "Spionaggio mostri",
    icon: Binoculars,
    emoji: "👁️",
    duties: ["osservazione", "debolezze", "comportamento", "bestiario"],
    bonuses: ["dati extra", "debolezze svelate", "meno combattimenti inutili"],
    bestTypes: ["Bianco", "Alato", "Ghiaccio"],
  },
  {
    key: "combattimento",
    title: "Combattimento e difesa",
    icon: Shield,
    emoji: "🛡️",
    duties: ["difesa villaggio", "caccia", "scorta", "eventi notturni"],
    bonuses: ["danno", "resistenze", "protezione squadra"],
    bestTypes: ["Rosso", "Roccia", "Viola"],
  },
  {
    key: "supporto",
    title: "Supporto squadra",
    icon: Heart,
    emoji: "💚",
    duties: ["cura", "morale", "buff energia", "protezione ambientale"],
    bonuses: ["rigenerazione", "morale +", "resistenza elementi"],
    bestTypes: ["Ghiaccio", "Bianco", "Blu"],
  },
];

/** Squadra mock — pronta per tabella Supabase `pikmin_units` */
export const MOCK_PIKMIN_SQUAD: PikminUnit[] = [
  {
    id: "pk-001",
    name: "Fiamma",
    type: "rosso",
    level: 4,
    experience: 320,
    experienceToNext: 500,
    specialization: "combattimento",
    stats: { forza: 82, velocita: 55, resistenza: 70, intelligenza: 40 },
    preferredBiome: "bosco",
    story: "Primo Pikmin addestrato da Lorenzo. Protettore del villaggio.",
    status: "disponibile",
    ownerId: "lorenzo",
  },
  {
    id: "pk-002",
    name: "Onda",
    type: "blu",
    level: 3,
    experience: 180,
    experienceToNext: 350,
    specialization: "raccolta",
    stats: { forza: 45, velocita: 60, resistenza: 65, intelligenza: 55 },
    preferredBiome: "acqua",
    story: "Trovato vicino al litorale durante una scansione radar.",
    status: "in_missione",
    ownerId: "francesco",
  },
  {
    id: "pk-003",
    name: "Spark",
    type: "giallo",
    level: 5,
    experience: 610,
    experienceToNext: 800,
    specialization: "ricerca",
    stats: { forza: 35, velocita: 70, resistenza: 50, intelligenza: 90 },
    preferredBiome: "industriale",
    story: "Esperto nel trovare pezzi navicella e anomalie energetiche.",
    status: "disponibile",
    ownerId: "francesco",
  },
  {
    id: "pk-004",
    name: "Ombra",
    type: "bianco",
    level: 2,
    experience: 90,
    experienceToNext: 200,
    specialization: "spionaggio",
    stats: { forza: 30, velocita: 75, resistenza: 40, intelligenza: 85 },
    preferredBiome: "grotta",
    story: "Osserva i mostri per completare schede bestiario.",
    status: "addestramento",
    ownerId: "lorenzo",
  },
];

export const BIOMES: BiomeDefinition[] = [
  {
    key: "bosco",
    label: "Bosco",
    emoji: "🌲",
    theme: "verde profondo, muschio, luce filtrata",
    resources: ["legno", "resina", "foglie"],
    ingredients: ["frutti di bosco", "nettare", "funghi"],
    frequentPikmin: ["rosso", "alato"],
    frequentMonsters: ["Scarabée", "Bulborb nano"],
    events: ["pioggia di semi", "festival foglie"],
    rarity: "comune",
    bonus: "cibo +15%",
    malus: "visibilità ridotta di notte",
  },
  {
    key: "giardino",
    label: "Giardino",
    emoji: "🌻",
    theme: "colori vivaci, fiori, sentieri curati",
    resources: ["petali", "semi", "polline"],
    ingredients: ["miele", "bacche", "erbe aromatiche"],
    frequentPikmin: ["blu", "giallo"],
    frequentMonsters: ["Coccinella gigante", "Afide corazzato"],
    events: ["fioritura", "invasione afidi"],
    rarity: "comune",
    bonus: "morale +10%",
  },
  {
    key: "acqua",
    label: "Acqua",
    emoji: "🌊",
    theme: "riflessi, alghe, riva umida",
    resources: ["alghe", "conchiglie", "perle"],
    ingredients: ["gocce", "salicornia", "plancton"],
    frequentPikmin: ["blu", "ghiaccio"],
    frequentMonsters: ["Anfibio scuro", "Medusa di rame"],
    events: ["marea alta", "banco di lucciole"],
    rarity: "comune",
    bonus: "recupero +20%",
  },
  {
    key: "roccia",
    label: "Roccia",
    emoji: "🪨",
    theme: "pareti rocciose, cristalli, eco",
    resources: ["pietra", "cristalli", "minerali"],
    ingredients: ["polvere di quarzo", "sale roccia"],
    frequentPikmin: ["roccia", "viola"],
    frequentMonsters: ["Scarabeo corazza", "Geco di pietra"],
    events: ["frana controllata", "vena di cristallo"],
    rarity: "raro",
    bonus: "difesa +15%",
  },
  {
    key: "grotta",
    label: "Grotta",
    emoji: "🕳️",
    theme: "oscurità, stalattiti, bioluminescenza",
    resources: ["stalattiti", "spore", "nuclei"],
    ingredients: ["luminescenza", "umidità pura"],
    frequentPikmin: ["bianco", "luminoso"],
    frequentMonsters: ["Pipistrello caverna", "Slime ombra"],
    events: ["eclissi interna", "eco antica"],
    rarity: "raro",
    bonus: "ricerca +25%",
    malus: "morale -5% senza luce",
  },
  {
    key: "campo",
    label: "Campo",
    emoji: "🌾",
    theme: "prateria aperta, vento, orizzonte",
    resources: ["fieno", "semi selvatici", "argilla"],
    ingredients: ["grano", "radici", "bacche selvatiche"],
    frequentPikmin: ["giallo", "alato"],
    frequentMonsters: ["Locusta verde", "Talpa solare"],
    events: ["raccolto", "migratio Pikmin"],
    rarity: "comune",
    bonus: "scouting +20%",
  },
  {
    key: "citta",
    label: "Città",
    emoji: "🏙️",
    theme: "asfalto, parchi urbani, luci artificiali",
    resources: ["metallo leggero", "vetro", "cavi"],
    ingredients: ["bottiglie", "fiori urbani", "crumiri"],
    frequentPikmin: ["bianco", "giallo"],
    frequentMonsters: ["Gatto ombra", "Piccione corazzato"],
    events: ["mercato di strada", "blackout"],
    rarity: "comune",
    bonus: "crediti +10%",
  },
  {
    key: "industriale",
    label: "Industriale",
    emoji: "⚙️",
    theme: "ferro, macchinari, scintille",
    resources: ["rottami", "batterie", "chip", "metallo"],
    ingredients: ["olio", "scintille", "polvere di ferro"],
    frequentPikmin: ["giallo", "roccia"],
    frequentMonsters: ["Drone errante", "Rugginoso"],
    events: ["blackout industriale", "pezzo navicella"],
    rarity: "raro",
    bonus: "pezzi navicella +30%",
  },
];

/** Alias retrocompatibile per pannelli esistenti */
export const GEO_BIOME_RULES = BIOMES.map((b) => ({
  key: b.key,
  emoji: b.emoji,
  label: b.label,
  materials: b.resources,
  pikmin: b.frequentPikmin.map((k) => PIKMIN_TYPES.find((t) => t.key === k)?.label ?? k),
  threats: b.frequentMonsters,
  bonus: b.bonus,
}));

export const SCANNER_TARGETS: ScannerTarget[] = [
  { type: "pikmin_selvatico", label: "Pikmin selvatico", icon: Sprout, emoji: "🌱", note: "Può unirsi alla squadra se il segnale arriva al 100%", biomeLinked: true },
  { type: "oggetto_raro", label: "Oggetto raro", icon: Sparkles, emoji: "✨", note: "Vendibile, studiabile o usabile per missioni", biomeLinked: true },
  { type: "ingrediente", label: "Ingrediente", icon: Leaf, emoji: "🍯", note: "Convertibile in cibo o ricette di supporto", biomeLinked: true },
  { type: "materiale", label: "Materiale", icon: Package, emoji: "📦", note: "Usato per edifici e craft del villaggio", biomeLinked: true },
  { type: "mostro", label: "Mostro", icon: Camera, emoji: "👾", note: "Fotografalo e invia Pikmin spia per completare la scheda", biomeLinked: true },
  { type: "anomalia", label: "Anomalia energetica", icon: Zap, emoji: "⚡", note: "Evento speciale legato al bioma corrente", biomeLinked: true },
  { type: "pezzo_navicella", label: "Pezzo navicella", icon: Rocket, emoji: "🚀", note: "Aggiorna la missione Ricostruzione Navicella", biomeLinked: false },
];

export const VILLAGE_BUILDINGS: VillageBuildingDefinition[] = [
  { key: "centro_controllo", name: "Centro di Controllo", emoji: "🎛️", description: "Gestisce villaggi e comando remoto. Lv1=1 villaggio, Lv3=2, Lv5=3.", level: 1, maxLevel: 5 },
  { key: "magazzino", name: "Magazzino", emoji: "📦", description: "Conserva risorse e oggetti recuperati.", level: 1, maxLevel: 5 },
  { key: "accademia", name: "Accademia Pikmin", emoji: "🎓", description: "Addestra specializzazioni e mansioni.", level: 1, maxLevel: 4 },
  { key: "laboratorio", name: "Laboratorio", emoji: "🔬", description: "Analizza mostri, ingredienti e anomalie.", level: 1, maxLevel: 4 },
  { key: "mercato", name: "Mercato", emoji: "🏪", description: "Scambio locale prima del Market galattico.", level: 1, maxLevel: 3 },
  { key: "hangar", name: "Hangar Navicella", emoji: "🚀", description: "Mostra la navicella in costruzione.", level: 1, maxLevel: 3 },
];

export const VILLAGE_RULES = {
  maxVillagesByControlCenterLevel: { 1: 1, 3: 2, 5: 3 } as Record<number, number>,
  remoteControlBuilding: "centro_controllo",
  actionRadiusMeters: 150,
};

export const CHAT_CHANNELS: Array<{ key: ChatChannelKey; label: string; emoji: string }> = [
  { key: "famiglia", label: "Famiglia", emoji: "👨‍👦" },
  { key: "missioni", label: "Missioni", emoji: "🎯" },
  { key: "villaggio", label: "Villaggio", emoji: "🏘️" },
  { key: "comandante", label: "Comandante", emoji: "⭐" },
];

export const CHAT_QUICK_MESSAGES: ChatQuickMessage[] = [
  { id: "q1", text: "Ho trovato un mostro.", emoji: "👾", channel: "missioni" },
  { id: "q2", text: "Ho trovato un pezzo della navicella.", emoji: "🚀", channel: "missioni" },
  { id: "q3", text: "Mi serve energia.", emoji: "⚡", channel: "villaggio" },
  { id: "q4", text: "Mando i Pikmin in spedizione.", emoji: "🗺️", channel: "missioni" },
  { id: "q5", text: "Rientro al villaggio.", emoji: "🏠", channel: "famiglia" },
];

export const MOCK_FAMILY_ONLINE: FamilyCommander[] = [
  { id: "francesco", name: "Francesco", role: "comandante", emoji: "⭐", online: true },
  { id: "lorenzo", name: "Lorenzo", role: "comandante", emoji: "🌱", online: true, lastSeen: "2 min fa" },
];

export const MOCK_EXPEDITIONS: ExpeditionSummary[] = [
  { id: "exp-1", title: "Ricognizione Bosco Nord", biome: "bosco", status: "attiva", pikminCount: 8, etaMinutes: 25 },
  { id: "exp-2", title: "Recupero cristalli", biome: "roccia", status: "in_ritorno", pikminCount: 5, etaMinutes: 8 },
];

export const MOCK_DISCOVERIES: DiscoverySummary[] = [
  { id: "d1", label: "Seme luminoso", emoji: "✨", type: "oggetto_raro", foundBy: "Lorenzo", foundAt: "12 min fa" },
  { id: "d2", label: "Bulborb nano", emoji: "👾", type: "mostro", foundBy: "Francesco", foundAt: "1 ora fa" },
  { id: "d3", label: "Stabilizzatore", emoji: "🪽", type: "pezzo_navicella", foundBy: "Francesco", foundAt: "ieri" },
];

export const MOCK_MARKET_LISTINGS: MarketListing[] = [
  { id: "m1", name: "Cristallo di rame", emoji: "💎", price: 120, seller: "Francesco", category: "oggetto" },
  { id: "m2", name: "Batteria usata", emoji: "🔋", price: 45, seller: "Lorenzo", category: "materiale" },
  { id: "m3", name: "Miele dorato", emoji: "🍯", price: 30, seller: "Francesco", category: "ingrediente" },
];

export const MOCK_FAMILY_TRADES: FamilyTradeOffer[] = [
  { id: "t1", from: "Francesco", to: "Lorenzo", offer: "2× Cristallo", request: "5× Seme rosso", status: "aperta" },
  { id: "t2", from: "Lorenzo", to: "Francesco", offer: "Pezzo antenna", request: "Energia villaggio", status: "completata" },
];

export function getBiomeByKey(key: BiomeKey): BiomeDefinition | undefined {
  return BIOMES.find((b) => b.key === key);
}

export function getPikminType(key: PikminTypeKey): PikminTypeDefinition | undefined {
  return PIKMIN_TYPES.find((t) => t.key === key);
}

export function getCoreMission(key: CoreMissionKey): CoreMission | undefined {
  return CORE_MISSIONS.find((m) => m.key === key);
}

export function debtRemaining(): number {
  return PLANET_STATE.debtTotal - PLANET_STATE.debtPaid;
}

export function shipProgressPercent(): number {
  const collected = SHIP_PARTS.filter((p) => p.collected).length;
  return Math.round((collected / SHIP_PARTS.length) * 100);
}
