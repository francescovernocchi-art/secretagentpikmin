# Villaggio: motore grafico Phaser 3 (RTS 2.5D)

Sostituiamo **solo** il cuore grafico/interattivo della scena Villaggio con Phaser 3. Tutta l'UI, i pannelli, Supabase, login, missioni, inventario, mappa GPS, profilo restano invariati.

## Architettura

```
React (HUD + pannelli + dati Supabase)
   │
   │ props: bioma, edifici, pikmin, sprite_url, bonus, placementMode
   ▼
VillageGameCanvas.tsx  ← monta Phaser.Game in un <div>
   │
   ▼
VillageGame.ts → VillageScene.ts
   ├─ VillageCamera  (pan/zoom, pinch, bounds)
   ├─ VillageLayers  (terrain, paths, shadows, objects, buildings, pikmin, effects)
   ├─ VillageBuildings  (sprite per edificio + livello, ombra, depth = y)
   ├─ VillagePikmin     (sprite animati, AI vaga/segui)
   ├─ VillageConstruction (anteprima placement, validazione, cantiere)
   ├─ VillageEffects    (particelle, vento, luce ambiente)
   └─ VillageInput      (tap/drag/pinch, emette eventi)
```

### Bridge React ↔ Phaser

- React → Phaser: la scena espone `applyState(state)` chiamata in `useEffect` ogni volta che cambiano edifici, pikmin, bioma, prefs. Niente re-mount del Game.
- Phaser → React: `scene.events.emit('selectBuilding'|'placePosition'|'selectPikmin'|'tapGround', payload)`. `VillageGameCanvas` espone callback `onSelectBuilding`, `onPlacePosition`, ecc.

### Asset loading

- Niente sprite hardcoded. Al `preload` carica:
  - `building_catalog.image_url` + `visual_stages[0..4]` (già in DB)
  - `pikmin_species.sprite_url` per ogni specie posseduta
  - tile texture (erba/sentiero/acqua) generate proceduralmente con `Graphics.generateTexture()` per bioma → niente asset extra
- Fallback emoji renderizzato come texture se URL manca.

### Camera

- `cameras.main.setBounds(0,0, WORLD_W, WORLD_H)` con WORLD_W=2400, H=1600.
- Pan: drag con un dito.
- Zoom: wheel + pinch (gesto a due dita custom su `pointermove`).
- Zoom min calcolato per coprire viewport (niente bordi neri).
- Bordi mondo con fade radiale disegnato nella scena (`Graphics` con `BlendMode.MULTIPLY`).

### Terreno organico

- `TerrainLayer`: rect bioma-color full-mondo + 400 decorazioni sparse (ciuffi erba, fiori, sassolini) con `seedrandom` su `userId` per stabilità.
- `PathsLayer`: curve di Bezier che collegano gli edifici al Centro Comando.
- Nessuna griglia visibile; griglia logica 50×50 interna per snap placement.

### Edifici (depth = y per 2.5D)

- Per ogni `base_building` con stato `building|upgrading|idle`:
  - Sprite con texture `building:${key}:${level}` o fallback emoji.
  - Ombra ellittica sotto (`Graphics`).
  - `depth = y` per ordinamento 2.5D corretto.
  - Tap → emette `selectBuilding(id)`.
  - Se `building`/`upgrading`: barra progresso animata sopra.
- Edifici `available/locked` **non** vengono mai aggiunti alla scena.

### Pikmin

- Per ogni specie posseduta, spawn N sprite (N proporzionale al breakdown, cap = pref slider).
- AI semplice: wander con `Phaser.Math.RandomXY`, occasionalmente target un edificio.
- Animazione walk: tween `scaleY` 1↔0.92 (squash) + flip orizzontale.
- Sprite caricato da `pikmin_species.sprite_url`.

### Construction flow

1. React `BuildPanel` → utente sceglie edificio → setta `placementMode={key, image}` su `VillageGameCanvas`.
2. Phaser entra in `ConstructionMode`: sprite fantasma segue il dito, tinta verde/rossa per zona valida (no overlap altri edifici, dentro inset 18%/15%).
3. Tap conferma → `onPlacePosition({key, x, y})` → React fa `INSERT base_buildings` Supabase → aggiorna props → scena ridisegna.
4. Cancel: ESC / bottone React.

### Mostri

- Zero rendering nella scena. Solo `ThreatBadge` React (già esistente) e `ThreatAlertPanel` come Sheet.

## File

**Creare**
- `src/components/village/VillageGameCanvas.tsx` — wrapper React, monta/distrugge Phaser, bridge props/eventi.
- `src/game/village/VillageGame.ts` — `new Phaser.Game(config)`, headless setup.
- `src/game/village/VillageScene.ts` — scena principale, orchestratore.
- `src/game/village/VillageCamera.ts` — controllo camera/pan/zoom/pinch.
- `src/game/village/VillageLayers.ts` — z-order helpers + creazione container.
- `src/game/village/VillageBuildings.ts` — gestore sprite edifici (add/update/remove diff).
- `src/game/village/VillagePikmin.ts` — pool pikmin + AI wander.
- `src/game/village/VillageConstruction.ts` — placement ghost + validazione.
- `src/game/village/VillageEffects.ts` — particelle vento/foglie, fog radiale.
- `src/game/village/VillageInput.ts` — gesture unificate (tap vs drag vs pinch).
- `src/game/village/VillageTypes.ts` — interfacce `VillageGameProps`, `VillageGameEvents`, ecc.

**Modificare**
- `src/routes/villaggio.tsx` — sostituisce `<VillageMap />` con `<VillageGameCanvas />` passando stessi dati. BottomMenu, ThreatBadge, FixedTopHud, ModalPanels restano.
- `src/components/village/panels/BuildPanel.tsx` — attiva `placementMode` sul canvas (callback), ascolta conferma.

**Lasciare invariati (potenzialmente eliminabili in futuro, ma non ora)**
- `VillageMap.tsx`, `VillageMapViewport.tsx`, layer `EdgeFogLayer`, `TerrainLayer`, `BuildingsLayer`, `VillagePikminLayer`, `BuildingMarker`. Non li tocchiamo per non rompere `villaggio.$agent.tsx` o altri usi. La rotta `/villaggio` smette di importarli.

**Dipendenze**
- `bun add phaser`

## Cosa NON tocchiamo

- Auth, Supabase client, RLS, profili.
- Schema DB (sprite/livelli sono già in `visual_stages`, `pikmin_species.sprite_url`).
- Inventario, missioni, mappa GPS, agenti, scambi.
- `villaggio.$agent.tsx`, `villaggio.edifici.tsx`, `villaggio.scambi.tsx`.
- Admin editor (continua a popolare gli stessi campi DB letti da Phaser).

## Note tecniche

- Phaser SSR-safe: import dinamico in `useEffect` per evitare `window is not defined`.
- `<canvas>` con `width=100dvw`, `height=100dvh`, `image-rendering: auto` (non pixelato — vogliamo look morbido).
- Render scale `Phaser.Scale.RESIZE` + `parent` div.
- Cleanup: `game.destroy(true)` in cleanup `useEffect`.
- Sprite remoti: `scene.load.image(key, url)` con `crossOrigin='anonymous'` su `scene.load.crossOrigin`.
- Ricarica sprite quando cambiano: diff su prop, `scene.load.image()` + `scene.load.start()`, sostituisce texture.

## Ordine di esecuzione

1. `bun add phaser`.
2. Scaffolding `src/game/village/*` con scena vuota che disegna terreno bioma e mostra "Phaser OK".
3. `VillageGameCanvas` + integrazione in `villaggio.tsx` (sostituisce `VillageMap`).
4. Camera pan/zoom/pinch.
5. Edifici da props (con ombra + depth y).
6. Pikmin da props con wander.
7. Placement mode con ghost.
8. Effetti (fog radiale, particelle leggere).
9. QA mobile (407×749).
