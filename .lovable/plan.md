## Trasformazione Villaggio — Sistema Colonia Vivente

Progetto enorme. Propongo un'implementazione **a fasi incrementali**, partendo dalle fondamenta (fazioni + buildings evolutivi + difese) per poi aggiungere strati vivi (AI Pikmin, eventi, coop). Ogni fase è autonoma e shippabile senza rompere gameplay esistente.

---

### Strategia generale

- **Zero breaking changes**: mappa, missioni, inventario, realtime restano intatti.
- **Estendo `bases` + `base_buildings`** (già esistenti) invece di creare tabelle parallele.
- **Tutto in italiano** lato UI, codice in inglese.
- **RLS rispettata**: ogni nuova tabella usa `is_family_member()` / `current_agent_key()`.

---

### FASE A — Fondamenta (Sprint 1, questa iterazione)

**A1. Database**
- `ALTER bases` → aggiunge `faction` (eco|tech|battle|mystic), `energy_current`, `energy_max`, `defense_rating`.
- Nuova `village_walls` (segmenti muro: from_x, from_y, to_x, to_y, level, material).
- Nuova `village_events` (invasioni, blackout, tempeste — payload jsonb).
- Estende `building_catalog`: aggiunge categorie `defense`, `energy`, `production`, `research` + `faction_required` opzionale.
- Seed nuovi buildings (12 tipi) + costi/bonus per livello.

**A2. Selezione Fazione**
- Schermata "Scegli la tua colonia" al primo accesso al villaggio (se `faction IS NULL`).
- 4 cards animate con palette/iconografia dedicata, bonus chiari.
- Persistenza in `bases.faction`.

**A3. Vista Villaggio rivisitata**
- Sostituisce dashboard attuale con **canvas isometrico/top-down** SVG+CSS animato.
- Sfondo che cambia in base a fazione (eco=foresta, tech=neon, battle=bunker, mystic=cristalli).
- Buildings posizionati su griglia, sprite evolutivi per livello (1-2-3-4-5 = stadi visuali diversi via CSS/emoji+effetti).
- Ciclo giorno/notte (luce ambientale CSS che cambia ogni X ore reali).
- Particelle ambient (foglie/scintille/fumo a seconda fazione).

**A4. Buildings evolutivi**
- Sistema upgrade già esistente esteso con visual stages.
- Bonus reali applicati: greenhouse → +pikmin/h, reactor → +energy_max, defense tower → +defense_rating.
- Hook lato client che calcola bonus aggregati dalla base.

---

### FASE B — Difese & minacce (Sprint 2)

- Editor muri (drag su griglia, segmenti connessi).
- Torri difensive con range visuale.
- Quando `map_enemy_spawns` è entro X metri dalla base → evento "minaccia". Defense rating vs danger level decide outcome automatico ogni N minuti.
- Notifiche italiane in `mission_notifications`.

---

### FASE C — AI Pikmin vivente (Sprint 3)

- Layer di sprite Pikmin animati che camminano sulla griglia villaggio (puro client, no DB).
- Comportamenti randomici: trasporta, dorme, festeggia, ripara (state machine leggera con framer-motion).
- Reazioni a eventi (corre via durante invasione).

---

### FASE D — Eventi dinamici + Coop (Sprint 4)

- Cron-like trigger (pg_cron o check on-load) che genera eventi notturni.
- Visite ad altri villaggi: route `/villaggio/:agent`, lettura read-only + donazioni via `base_gifts`.

---

### Cosa implemento ORA (FASE A completa)

1. Migration: estensione `bases`, nuove `village_walls` + `village_events`, seed catalog allargato.
2. `src/components/village/FactionSelector.tsx` — onboarding fazione.
3. `src/components/village/VillageCanvas.tsx` — vista vivente con sfondo dinamico, griglia, buildings sprite evolutivi, day/night, particelle.
4. `src/components/village/BuildingSprite.tsx` — singolo edificio con 5 stadi visuali per fazione.
5. `src/lib/village/factions.ts` — config fazioni (bonus, palette, sprite).
6. `src/lib/village/bonuses.ts` — calcolo bonus aggregati.
7. `src/routes/base.tsx` — refactor per usare nuovi componenti (mantiene logica e API esistenti).
8. Tutti i testi in italiano naturale.

### Dettagli tecnici chiave

- Nessuna modifica a `agents`, `agent_positions`, `missions`, `inventory`, `pikmin_squad`.
- Nuove tabelle con RLS identica al pattern esistente.
- Visual: Tailwind + framer-motion (già nel progetto), zero nuove dipendenze pesanti.
- Sprite: combinazione emoji grandi + SVG layer + filter CSS per stadi evolutivi (es. level 5 = glow + scale + corona particelle).

### Fuori scope per questa iterazione

- Coop visite (Fase D)
- AI Pikmin animata (Fase C — accenno solo statico)
- Editor muri drag (Fase B)
- pg_cron eventi automatici (Fase B)

Confermi che parto con la **FASE A** come descritta? Oppure preferisci che inizi da un'altra fase (es. direttamente AI Pikmin viventi o difese)?
