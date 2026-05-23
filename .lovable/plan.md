## Mappa Geolocalizzata + Campo Base + Villaggio sulla Mappa

Refactor incrementale che corregge la logica geo-distanze, introduce il Campo Base scelto sulla mappa, mostra il villaggio in quel punto e filtra correttamente avvisi di difesa e azioni sui mostri.

### 1. Database (migration unica, RLS preservata)

Estendo `bases` (no breaking, tutto nullable con default):
- `base_name text` (default 'Campo Base')
- `action_radius integer default 300`
- `threat_radius integer default 300`
- `village_level integer default 1` *(se non già coperto da `level`, altrimenti riuso `level`)*

Nuova tabella `map_objects` (pezzi navicella / risorse / capsule rivelabili da spionaggio):
- `id uuid`, `agent text` (proprietario/famiglia), `object_type text`, `lat/lng double precision`,
- `visible boolean default true`, `discovered boolean default false`,
- `metadata jsonb default '{}'`, `created_at`.
- RLS: `is_family_member()` per SELECT, `agent = current_agent_key()` per INSERT/UPDATE/DELETE — niente `USING (true)`.

Nuova tabella `scouting_missions`:
- `id`, `agent`, `target_spawn_id uuid null`, `target_lat/lng`, `pikmin_count int`,
- `status text` (`active|completed|failed`), `started_at`, `end_at`, `result jsonb`.
- RLS: stessa logica per-famiglia + own-write.

Nessuna modifica a `map_enemy_spawns` (lat/lng/danger già presenti tramite join con `enemies`).

### 2. Libreria geo condivisa

- `src/lib/geo/distance.ts` → `calculateDistanceMeters(lat1,lng1,lat2,lng2)` (Haversine) + helper `metersBetween(a,b)`.
- `src/lib/map/radiusRules.ts` → costanti `PLAYER_ATTACK_RADIUS=200`, `BASE_ACTION_RADIUS=300`, `BASE_THREAT_RADIUS=300`, `SCOUTING_MIN_DISTANCE=200` + helpers `canAttackEnemy`, `canThreatenBase`, `canScout`.
- `src/lib/village/threats.ts` → riusa `calculateDistanceMeters`, usa `BASE_THREAT_RADIUS` da `bases.threat_radius` (fallback 300). Sostituisce l'attuale costante 500m e impedisce eventi se nessun mostro è davvero nel raggio.

### 3. Onboarding Campo Base

Nuovo componente `src/components/map/BaseSetupOverlay.tsx`:
- Se l'utente non ha `bases` con `lat/lng`, mostra overlay sulla mappa "Scegli il tuo Campo Base".
- Tap/click sulla mappa → cattura coords → prompt nome → INSERT in `bases` (`agent = current_agent_key()`).
- Dopo creazione, centra mappa sul campo.

### 4. Villaggio visibile sulla mappa

`src/components/map/VillageMapMarker.tsx`:
- Marker villaggio con emoji/stile per fazione + badge livello.
- Pulsante "Apri villaggio" → `/villaggio`.

`src/components/map/BaseRadiusLayer.tsx`: cerchio `action_radius` + cerchio `threat_radius` (colorato diverso, tratteggiato).

`src/components/map/PlayerRadiusLayer.tsx`: cerchio 200m attorno alla posizione giocatore (toggle via filtri).

Edifici/mura/torri della base: leggo `base_buildings` + `village_walls` e li disegno come piccoli marker emoji posizionati ATTORNO al campo base (offset deterministico da `position_x/y`, scalati su ~100m). Niente coordinate reali: visualizzazione progressiva mano a mano che si costruisce.

### 5. Logica mostri (200m attacco / spionaggio oltre)

`src/components/map/MonsterActionPanel.tsx`:
- Calcola distanza giocatore↔mostro.
- Se `≤ 200m` → pulsante **Attacca** (riusa flusso esistente `EnemyLayer`/combattimento).
- Se `> 200m` → mostra "Fuori raggio · 412m" + pulsante **Invia Pikmin in spionaggio**.

`EnemyLayer.tsx`: aggiorno il popup/marker per nascondere "Attacca" quando fuori 200m e sostituirlo con CTA spionaggio (callback verso `MonsterActionPanel`).

### 6. Spionaggio

`src/components/map/ScoutingMissionPanel.tsx`:
- Form: Pikmin da inviare (min/recommended/max), durata calcolata (es. 30s per 100m, cap 5min), rischio.
- Crea riga in `scouting_missions` (status active, end_at).
- Spende Pikmin via `spendPikmin`.
- Polling/realtime: al completamento genera `result` jsonb con drop possibili:
  - rivela `monster_type`, `danger_level`, debolezze (da `enemies.weaknesses`/`recommended_pikmin`),
  - 25% probabilità di scoprire un `map_objects` ship_part nelle vicinanze del target (INSERT con `discovered=true`),
  - testo italiano: *"I Pikmin hanno trovato tracce sospette vicino al mostro…"*.
- Restituisce Pikmin sopravvissuti (rischio = perdita parziale).

### 7. Difesa villaggio (fix avvisi falsi)

`src/lib/village/threats.ts` aggiornato:
- Usa `bases.threat_radius` reale.
- Crea evento `threat`/`threat_repelled` SOLO se almeno un mostro è `≤ threat_radius` dal Campo Base.
- Disabilita generazione "raid notturno" casuale in `src/lib/village/night.ts` quando nessun nemico reale è nel raggio (sostituisce evento con altri non-raid).

### 8. Filtri mappa

`src/components/map/MapFilters.tsx`:
- Pannello flottante (bottone con icona Filter) con switch (Switch UI esistente):
  - Mostri, Campo Base, Villaggio, Raggio giocatore, Raggio Campo Base, Oggetti, Pezzi di navicella, Risorse, Missioni, Drop, Alleati, Zone pericolose.
- Stato persistito in `localStorage('map.filters')`.
- `mappa.tsx` legge i filtri e mostra/nasconde i relativi layer (drop marker, agentMarkers, EnemyLayer, BaseRadiusLayer, PlayerRadiusLayer, VillageMapMarker).

### 9. Pezzi navicella / oggetti

- I `map_objects` con `object_type='ship_part'` appaiono sulla mappa solo se `discovered=true`.
- Spionaggio può flippare `discovered=true` o crearne di nuovi vicino al target.

### 10. Refactor `mappa.tsx`

Modifiche chirurgiche (no rewrite completo):
- Sostituire `distMeters` locale con import da `geo/distance`.
- Aggiungere stato `base`, filtri, layer nuovi.
- Onboarding overlay quando `base` mancante.
- Tap handler in modalità "place base" se l'utente sta scegliendo.

### File creati / modificati

Nuovi:
- `src/lib/geo/distance.ts`
- `src/lib/map/radiusRules.ts`
- `src/components/map/MapFilters.tsx`
- `src/components/map/BaseRadiusLayer.tsx`
- `src/components/map/PlayerRadiusLayer.tsx`
- `src/components/map/VillageMapMarker.tsx`
- `src/components/map/MonsterActionPanel.tsx`
- `src/components/map/ScoutingMissionPanel.tsx`
- `src/components/map/BaseSetupOverlay.tsx`
- 1 migration SQL (estende `bases`, crea `map_objects` + `scouting_missions` con RLS)

Modificati:
- `src/lib/village/threats.ts` (radius da DB, usa helper geo)
- `src/lib/village/night.ts` (no raid se nessun mostro reale)
- `src/components/EnemyLayer.tsx` (hide attacco oltre 200m, CTA spionaggio)
- `src/routes/mappa.tsx` (layer, filtri, onboarding, base marker)
- `src/lib/base.ts` (tipi: action_radius, threat_radius, base_name)

### Cosa NON tocco

Auth/RLS pattern esistente, missioni, inventario, realtime channels, navigazione, layout villaggio (`/villaggio` page resta intatta, viene solo "specchiata" sulla mappa).

Procedo con la migration + tutti i file?
