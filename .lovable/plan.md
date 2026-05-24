## Obiettivo

Trasformare il Villaggio da "immagine bioma zoomabile + sprite sopra" a una **vera mappa multilayer tile-based**, viva, costruibile, in stile mini-colonia Pikmin con oggetti quotidiani giganti riutilizzati come edifici.

## Cosa cambia (vs. attuale)

- Lo sfondo bioma diventa un **terreno procedurale a tile** (non più una jpg unica).
- Edifici, Pikmin, mura, oggetti, effetti vivono in **layer separati** sopra il terreno.
- Stato edificio reale: `locked | available | under_construction | built | upgrading` con cantiere visibile.
- Pan/zoom agisce sulla **scena reale multilayer**, con limiti mappa e centratura su Campo Base.
- Sprite di Pikmin/edifici/mostri/oggetti letti **sempre da DB/Storage** (mai hardcoded).
- Minacce villaggio attive **solo** se mostro entro il raggio reale del Campo Base (GPS).

## Architettura nuova

### Mondo: tile map virtuale

- Coordinate mondo in tile (es. 64×64 tile, tile = 48px logico).
- `mapProjection.ts`: world↔screen, world↔GPS (Campo Base = origin GPS).
- `tileMap.ts`: tipi di tile per bioma (erba/sabbia/roccia/neve/lava/metallo/...), generatore deterministico seeded per agente.

### Layer (z-order)

1. `TerrainLayer` – tile bioma (canvas o griglia CSS)
2. `PathLayer` – sentieri tra edifici
3. `FieldsLayer` – campi/orti
4. `BuildingsLayer` – edifici via `BuildingMarker`
5. `WallsLayer` – mura (riusa logica esistente)
6. `ObjectsLayer` – decor giganti del bioma (sprite_assets `category=decorazione`)
7. `PikminLayer` – Pikmin viventi (riusa `VillagePikminLayer`)
8. `MonsterThreatLayer` – minacce reali entro raggio Campo Base
9. `EffectsLayer` – particelle bioma + giorno/notte
10. `InteractionLayer` – hit-test click/tap su tile vuoti (per piazzare edifici)
11. `HudLayer` – marker raggio Campo Base, indicatori

### Viewport / camera

- `VillageMapViewport.tsx`: pan + pinch + wheel zoom con **inerzia**, clamp ai limiti world, `centerOnBase()`.
- Sostituisce `VillageZoomPan` per la pagina villaggio (resta utility se serve altrove).

### Edifici

- `BuildingMarker.tsx`: render singolo edificio in coord world, sprite da `building_catalog.image_url` o stage da `visual_stages`, badge livello, tap.
- `ConstructionSite.tsx`: visual cantiere (impalcature + timer) per `under_construction` / `upgrading`.
- Stato derivato:
  - `locked`: requisiti non soddisfatti → non in scena, non in menu
  - `available`: in menu costruzioni, non in scena
  - `under_construction` / `upgrading`: cantiere in scena
  - `built`: sprite finale

### Sprite via DB

- Tutti i visual leggono `image_url` / `icon_url` / `sprite_*_url` (già aggiunti su `pikmin_species`, `enemies`, `building_catalog`, `sprite_assets`). Fallback emoji solo se URL mancante.
- `ObjectsLayer` pesca da `sprite_assets` filtrati per `tags` che includono il bioma.

### Geo + minacce

- `lib/geo/distance.ts`: haversine.
- `MonsterThreatLayer` mostra mostri **solo** se `distance(player_or_base, spawn) ≤ raggio` (200m attacco / `base.action_radius` per villaggio).
- Niente eventi falsi: `ThreatAlertPanel` continua a usare `computeNearbyThreats` già reale.

## File da creare

```
src/lib/geo/distance.ts
src/lib/village/tileMap.ts
src/lib/village/mapProjection.ts
src/lib/village/villageLayers.ts
src/components/village/VillageMap.tsx
src/components/village/VillageMapViewport.tsx
src/components/village/VillageMapControls.tsx
src/components/village/BuildingMarker.tsx
src/components/village/PikminMarker.tsx
src/components/village/ConstructionSite.tsx
src/components/village/layers/TerrainLayer.tsx
src/components/village/layers/PathLayer.tsx
src/components/village/layers/FieldsLayer.tsx
src/components/village/layers/BuildingsLayer.tsx
src/components/village/layers/WallsLayer.tsx
src/components/village/layers/ObjectsLayer.tsx
src/components/village/layers/PikminLayer.tsx
src/components/village/layers/MonsterThreatLayer.tsx
src/components/village/layers/EffectsLayer.tsx
src/components/village/layers/InteractionLayer.tsx
src/components/village/layers/HudLayer.tsx
```

## File da modificare

- `src/routes/villaggio.tsx` → sostituire blocco `<VillageZoomPan><VillageCanvas/>...</>` con `<VillageMap base={...} buildings={...} .../>`.
- `src/components/village/VillageCanvas.tsx` → deprecato (lasciato come fallback "/villaggio/$agent" finché non migrato), oppure rimpiazzato anche lì.

## Stile visivo

- Tile cartoon morbidi generati via CSS gradients + pattern SVG inline (no nuove jpg), così resta leggero e reattivo allo zoom.
- Edifici = sprite caricati da admin (oggetti quotidiani giganti). Catalogo iniziale fornisce solo emoji di fallback.
- Palette per bioma riusata da `BIOMES[*].accent`.

## Cosa NON cambia ora

- Modello DB (campi già sufficienti). Eventuale aggiunta `base_buildings.unlock_requirements` rimandata.
- Logica costi/timer in `lib/base.ts`.
- Mura, eventi notturni, cosmetics, HUD.

## Verifica

- Build pulita (TypeScript strict).
- Villaggio nuovo si carica senza rompere `villaggio/$agent` (partner view).
- Pan/zoom fluido, niente scroll della barra inferiore.
- Edifici cliccabili, cantieri visibili durante costruzione.

## Scope esplicitamente fuori da questa iterazione

- Editor visuale tile-by-tile.
- Path-finding Pikmin (resta animazione ambient esistente).
- Generatore procedurale avanzato di villaggi cresciuti (la crescita resta data-driven dal numero di edifici/livelli).
