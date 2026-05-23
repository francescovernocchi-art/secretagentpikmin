# Piano di lavoro

Lavoro grande e trasversale: lo divido in 4 fasi indipendenti. Confermami e procedo in ordine, oppure dimmi da quale partire.

## Fase 1 — Menu raggruppato (BottomNav)

Oggi la bottom nav ha troppe voci. Le raggruppo in:

- **Gioco**: Mappa, Missioni, Spedizioni, Nemici
- **Villaggio**: Villaggio, Edifici, Scambi, Campo Base
- **Inventario**: Inventario, Ricette, Navicella, Premi
- **Personalizza** (nuovo gruppo): Atelier, personalizzazione villaggio, skin Pikmin, icone, temi, customizer base
- **Profilo**: Profilo, Famiglia, Admin

Implementazione: `BottomNav.tsx` mostra 5 icone principali; tap apre un drawer/sheet con le voci del gruppo. Niente cambi di route inutili.

## Fase 2 — Collegamenti

**Mappa ↔ Villaggio ↔ Drop**
- Sulla mappa: tap su marker villaggio → naviga a `/villaggio`; tap su drop → apri pannello raccolta che apre `/inventario` dopo il claim.
- Nel villaggio: pulsante "Vedi sulla mappa" che centra mappa su coordinate base.
- I drop raccolti vanno in `inventory` (già esistente) + notifica visibile in HUD villaggio.

**Missioni ↔ Spedizioni**
- Le spedizioni oggi non risolvono: aggiungo loop di risoluzione (quando `end_at < now()` e `status='active'`, calcolo rewards da `rewards_pool` del template, scrivo in `expeditions.rewards`, aggiungo a inventario/coins, status `resolved`).
- Una missione completata può sbloccare una spedizione successiva (catena via `template_key`).
- Notifica unica nella pagina `/missioni` con tab "Missioni" / "Spedizioni in corso" / "Concluse".

## Fase 3 — Inventario Pikmin per tipo

Oggi `pikmin_squad.breakdown` è un jsonb generico. Lo rendo first-class:

- Migrazione: tabella `pikmin_inventory` (agent, species_key, count) con RLS family-read + own-write. `pikmin_species` già esiste.
- UI nuova in `/inventario`: tab "Pikmin" con lista per specie (rosso, blu, giallo, viola, bianco, roccia, alato…), conteggio, abilità.
- Selettore squadra: quando invio Pikmin in missione/spedizione/spionaggio/attacco, scelgo **quanti e di quale tipo** (non più solo numero totale).
- Refactor: `spendPikmin`/`addPikmin` accettano `species_key`; le funzioni che oggi consumano "n Pikmin generici" diventano "n Pikmin di specie X".
- Suggerimento automatico: in base ai dati del mostro/missione, propongo la composizione ottimale ma resta libera.

## Fase 4 — Villaggio come scena isometrica viva

Riscrittura `/villaggio` (non più dashboard):

**Struttura file** (come richiesto):
- `VillagePage.tsx` — orchestratore
- `VillageCanvas.tsx` — scena isometrica con edifici/mura/Pikmin
- `VillageBackground.tsx` — terreno per fazione (foresta/neon/bunker/cristalli)
- `BuildingSprite.tsx` — sprite isometrico per tipo×livello (1→5: semplice→leggendario), con animazione idle, hover dettagli, barra costruzione
- `VillageHud.tsx` — HUD top (agente, livello, nettare, cristalli, energia, Pikmin)
- `VillageActions.tsx` — pulsanti rapidi (Costruisci, Pikmin, Magazzino, Mappa)
- `VillageStatsPanel.tsx` — pannello destro (fazione, livello villaggio, difesa, raggio)
- `VillageParticles.tsx` — foglie/scintille/fumo per fazione
- `DayNightLayer.tsx` — overlay ciclo giorno/notte (riusa `daycycle.ts`)
- `PikminAmbientLayer.tsx` — Pikmin che camminano tra edifici (riuso `PikminLife.tsx` come base)
- `ThreatAlertPanel.tsx` — **solo se** mostri reali entro `base.threat_radius` (Haversine). Altrimenti "Nessuna minaccia rilevata".

**Sprite isometrici**: SVG/emoji compositi originali (no asset Nintendo). `buildingVisuals.ts` mappa `type×level → {emoji, accent, glow, size}`. Evoluzione visiva: 1 capanna → 5 struttura cristallina dorata.

**Calcoli bonus**: `bonuses.ts` già esiste, lo estendo per coprire tutti gli edifici richiesti (Officina = velocità costruzione, Hangar = bonus spedizioni, Infermeria = recovery Pikmin, Recinto = capacità massima).

**Tutto testo italiano**, codice/variabili inglesi.

**Fallback**: se base senza coordinate → mostro overlay onboarding già esistente (`BaseSetupOverlay`). Se nessun edificio → terreno vuoto + tutorial "Costruisci il Centro Comando".

## Sicurezza
- Nessun cambio RLS, nessun `USING (true)`.
- Migrazione solo additiva (nuova tabella `pikmin_inventory`).
- Login/Supabase/realtime intatti.

---

**Vuoi che parta da tutte e 4 in sequenza, oppure prima una fase specifica?** Consiglio l'ordine: 1 (menu) → 3 (inventario Pikmin, base per tutto) → 2 (collegamenti) → 4 (villaggio isometrico, il più grosso).
