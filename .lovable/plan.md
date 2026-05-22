
# Spedizioni Cooperative + Base Evolutiva

Aggiungiamo due grosse modalità al gioco, sviluppate **per fasi** così da avere subito qualcosa di giocabile e rifinire la grafica/atmosfera Pikmin-Nintendo nelle iterazioni successive.

I Pikmin inviati useranno il conteggio esistente (`pikmin_squad`): vengono "occupati" durante la spedizione e tornano (con eventuali perdite) al rientro. Durate **medie**: 15 min – 2 ore in tempo reale.

---

## FASE 1 — Spedizioni (singole + coop)

### Nuova sezione `/spedizioni`
- Hub con tre tab: **Disponibili**, **In corso**, **Storico**.
- Card missione con: bioma, durata stimata, difficoltà (Facile → Leggendaria), rischio, rarità ricompense, Pikmin min/consigliati/max, partner se coop.
- Stile Pikmin-like: card grandi, colori naturali, icone bioma, badge difficoltà colorati.

### Flusso lancio spedizione
1. Tocco card → schermata **Preparazione squadra**.
2. Slider Pikmin totale + breakdown per tipo (rosso/blu/giallo/roccia/foglia…).
3. UI mostra in tempo reale:
   - barra **Potenza spedizione**
   - **% successo stimata**
   - **rischio** (basso/medio/alto)
   - **bonus compatibilità bioma** (es. blu+lago)
   - effetto numero Pikmin vs consigliato (lento/stabile/veloce)
4. Conferma → Pikmin sottratti, missione creata, timer parte.

### Missioni coop
- Toggle "Coop" alla creazione → notifica al partner (badge campanella in BottomNav + record in `mission_notifications`).
- Il partner apre la missione, vede squadra dell'altro, aggiunge la propria, può confermare.
- Quando entrambi confermano → la spedizione parte con **bonus cooperazione** (+15% successo, +rarità ricompense).
- UI mostra due colonne (Papà / Lorenzo) con conteggi, tipi, contributo alla potenza totale.

### Risoluzione spedizione
- Timer reale (Supabase `end_at`). Quando scade, primo client che apre la sezione esegue la risoluzione (server function) → idempotente.
- Eventi casuali registrati lungo il percorso: tempesta, mostro, tesoro raro, segnale misterioso, danni, creatura amichevole. Mostrati come **diario spedizione** scorrevole al rientro.
- Output: ricompense (ingredienti, ship_parts, coins, XP) + eventuali Pikmin persi → applicati con `adjust_pikmin` e `inventory`.

### Biomi (seed iniziale)
Foresta, Lago, Zona Urbana, Area Industriale, Caverna, Rovine, Serra Tropicale. Ogni bioma definisce: Pikmin consigliati, pool ricompense, pool nemici, palette colori UI.

---

## FASE 2 — Base Evolutiva

### Nuova sezione `/base`
- Onboarding: l'utente sceglie la **posizione della propria base** sulla mappa (drop pin nel raggio del proprio comune). Salvato in `bases`.
- Vista principale: **panorama 2D illustrato** della base, con parallax leggero, edifici cliccabili, Pikmin animati che camminano/lavorano/riposano.
- HUD in alto: livello base, risorse chiave, notifiche costruzioni.

### Strutture costruibili (con livelli 1→5)
Serra, Laboratorio, Torre Radar, Magazzino, Incubatore, Centro Cura, Officina, Archivio Creature, Torre Comunicazioni, Giardino Pikmin, Cucina, Zona Relax.

Ogni struttura ha:
- costo risorse (ingredienti dall'inventario + coins)
- timer costruzione reale
- bonus passivi (es. Radar → +range mappa; Magazzino → +cap inventario; Incubatore → produzione Pikmin lenta; Torre Comunicazioni → notifiche coop più ricche).

### Visita base partner
- Pulsante "Visita base di Papà/Lorenzo" → vista in sola lettura + azioni: inviare materiali, dare un boost a una costruzione in corso, lasciare un messaggio Pikmin.

### Evoluzione visiva
- Sprite/illustrazioni per ogni edificio in 3 stadi (base, evoluto, maestro).
- Numero di Pikmin animati cresce col livello base. Vegetazione e dettagli aggiuntivi sbloccati a milestone.

---

## FASE 3 — Polish, atmosfera, animazioni

- Loop ambientale: foglie che cadono, vento, riflessi acqua, luci morbide (CSS + framer-motion + qualche SVG animato).
- Transizioni Nintendo-like tra schermate (zoom morbido + fade).
- Suoni opzionali (mute di default).
- Animazioni Pikmin: trasporto pezzi durante costruzioni, festa al completamento, sonno notturno (collegato al day/night già esistente).
- Notifiche in-app curate: costruzione completata, partner si è unito, ricompense, creatura rara, squadra insufficiente, bonus coop attivato, nuova struttura disponibile.

---

## Dettagli tecnici

### Nuove tabelle Supabase
```text
expeditions
  id, created_by, partner, status (preparing|active|completed|failed),
  biome, difficulty, mission_template_key,
  started_at, end_at, resolved_at,
  power, success_chance, risk,
  rewards_json, events_json, summary

expedition_squads
  id, expedition_id, agent, pikmin_total, breakdown jsonb, joined_at

mission_templates       (seed)
  key, title, description, biome, difficulty,
  duration_minutes, pikmin_min/recommended/max,
  recommended_types text[], rewards_pool jsonb, events_pool jsonb

bases
  agent (PK), lat, lng, level, name, created_at

base_buildings
  id, agent, type, level, status (idle|building|upgrading),
  build_end_at, position_x, position_y

base_events            (log per animazioni & notifiche)
  id, agent, type, payload, created_at

mission_notifications
  id, agent, kind, payload, read_at
```
Tutte con RLS aperta in stile "family open" come il resto del progetto.

### Server functions (TanStack `createServerFn`)
- `createExpedition`, `joinExpedition`, `confirmExpedition`
- `resolveExpedition` (idempotente, calcola eventi + ricompense)
- `placeBase`, `startBuilding`, `completeBuilding`, `boostBuilding`
- `sendMaterialsToPartner`, `getPartnerBase`

### Frontend
- Route: `src/routes/spedizioni.tsx`, `src/routes/spedizioni.$id.tsx`, `src/routes/base.tsx`, `src/routes/base.$agent.tsx`.
- Componenti modulari in `src/components/expeditions/*` e `src/components/base/*`.
- Hook `useExpeditionTimer`, `useBaseScene`.
- BottomNav: due nuove voci **Spedizioni** (icona razzo/foglia) e **Base** (icona casetta).
- Stile: nuovi token CSS in `src/styles.css` per palette bioma + ombre morbide Nintendo-like. Animazioni via framer-motion (già nel progetto) + SVG.

### Notifiche
Realtime Supabase su `mission_notifications` + `expeditions` per aggiornamento istantaneo lato partner.

### Persistenza
Timer in DB (`end_at`), cache locale leggera in `localStorage` per UI immediata. Risoluzione avviene anche a gioco chiuso (al primo accesso successivo).

---

## Piano di consegna

1. **Fase 1** (questa release): tabelle + seed biomi/templates, `/spedizioni` completa singola + coop, notifiche partner, risoluzione con eventi e ricompense, UI curata ma essenziale.
2. **Fase 2** (richiesta successiva): `/base`, posizionamento, costruzioni, visita base partner.
3. **Fase 3** (richiesta successiva): polish grafico, animazioni Pikmin, suoni, transizioni Nintendo-like.

Approva il piano e parto subito con la **Fase 1**.
