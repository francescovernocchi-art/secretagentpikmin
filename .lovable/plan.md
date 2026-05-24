# Villaggio fullscreen refactor

Trasformare `/villaggio` in una **mappa fullscreen immersiva** con UI modulare a pannelli, costruzione reale e nessun mostro nella scena.

## 1. Layout fullscreen della pagina

`src/routes/villaggio.tsx` smette di usare `PageShell` con scroll. Diventa:

```
<div class="fixed inset-0">           ← occupa tutto il viewport
  <MapViewport fullscreen />          ← canvas pan/zoom edge-to-edge
  <FixedTopHud />                     ← chip nome base + risorse, top-left, flottante
  <ThreatBadge />                     ← top-right, solo se ci sono minacce (notifica, no sprite)
  <BottomMenu />                      ← 5 bottoni: Costruzione, Difese, Bonus, Estetica, Pikmin
  <ModalPanels />                     ← sheet/drawer aperti dal menu
</div>
```

- `BottomNav` globale viene nascosto su questa pagina (rotta usa layout dedicato senza BottomNav, oppure flag).
- Mappa = `100vw x 100dvh`, nessun padding, nessun bordo card.

## 2. Mappa senza bordi neri

`VillageMapViewport`:
- Sfondo del container settato sul colore del bioma (non più `bg-black/transparent`).
- `WORLD_W/H` aumentati a 2400×1600 e il `TerrainLayer` esteso oltre con una **vignette/fade radiale** + cintura di decorazioni (alberi/rocce/montagne/acqua a seconda del bioma) sui bordi → nasconde i limiti.
- Min-scale calcolato in modo che il mondo copra sempre il viewport (no "edge raggiunto").
- Aggiunto `EdgeFogLayer` (nuovo) con gradiente radiale dal centro per dissolvere i bordi.

## 3. Bottom menu modulare

Nuovo componente `src/components/village/VillageBottomMenu.tsx`:
- 5 pulsanti grandi (44px+), icone + label, fissi in basso con safe-area.
- Ogni click apre il pannello relativo come **Sheet** (mobile-first, slide dal basso).

Pannelli (Sheet riusabile):
- `BuildPanel` — catalogo costruzioni reale (vedi §4).
- `DefensePanel` — mura, torri, raggio difesa, livello difese (sposta logica da `WallEditor` + difese aggregate).
- `BonusPanel` — bonus aggregati con origine (vedi §6).
- `AestheticsPanel` — sprite pikmin, layer toggle, decorazioni, skin (assorbe la **barra sprite attualmente sopra la mappa**).
- `PikminPanel` — squadra, breakdown, link inventario.

## 4. Costruzione reale

`BuildPanel`:
1. Lista catalogo (`building_catalog`) con stato per agente:
   - `locked` (requisiti non soddisfatti) → grigio, motivo
   - `available` → CTA "Costruisci"
   - `under_construction` / `built` / `upgrading` → mostrati nel pannello "Le mie strutture"
2. Click su "Costruisci" → modalità **placement**: la mappa entra in `placementMode`, l'utente tocca un punto, vede l'ombra anteprima della struttura, conferma → insert in `base_buildings` con `status='building'`, `build_end_at`.
3. Timer visibile sia nel pannello sia sul cantiere nella mappa.

**Strutture sulla mappa**: `BuildingsLayer` già filtra per `idle/building/upgrading`. Confermare e rimuovere qualsiasi rendering di edifici `available/locked` (eventuali placeholder grigi spariscono — solo cose realmente costruite o in cantiere appaiono).

## 5. Immagini strutture personalizzabili (admin)

Il DB ha già `building_catalog.image_url` + `visual_stages jsonb` (5 slot) e l'hook `useBuildingImages`. L'editor admin `BuildingsEditor` ha già upload base; **estendere** per:
- Upload distinto per `level_1…level_5` (slot `visual_stages[0..4]`), preview live.
- (Opzionale fase 2: variante per bioma — fuori scope ora, si lascia hook nei dati.)

`BuildingMarker` / `BuildingSprite` già usano `pickBuildingImage(set, level)` → nessuna immagine hardcoded; se manca, mostra emoji fallback con nota "Carica immagine in Admin".

## 6. Bonus aggregati

Nuovo `BonusPanel` che usa `computeVillageStatus` (già esistente in `lib/village/bonuses.ts`) + **breakdown per origine**:

```
+30 Energia max  ← Centro Comando Lv 3, Generatore Lv 2
+15 Difesa       ← Torre Lv 2, Mura
+5/h Pikmin      ← Serra Lv 3
+50 Scan         ← Radar Lv 2
```

Estendere `computeVillageStatus` per restituire anche `sources: { bonusKey, building, level, amount }[]`, poi il pannello li raggruppa.

## 7. Rimuovere mostri dalla scena villaggio

- Rimuovere `<MonsterThreatLayer />` da `VillageMap.tsx`.
- Rimuovere `EnemyLayer` se presente.
- Mantenere solo un **badge minaccia** flottante (top-right) che apre `ThreatAlertPanel` come Sheet — nessuno sprite di mostro nel mondo villaggio.

## 8. Rimuovere barra sprite/filtri sopra la mappa

`VillagePikminLayer` mostra attualmente una toolbar in alto con filtri specie e slider. La toolbar viene **rimossa dal layer** e ricostruita dentro `AestheticsPanel`. Le preferenze (`prefs` in localStorage) restano condivise.

## 9. Threats: solo notifica, no rendering mondo

`threats` continuano a essere caricati nella pagina per popolare il badge e il pannello — ma nessun layer li disegna sulla mappa villaggio.

## File interessati

**Modificare**
- `src/routes/villaggio.tsx` — layout fullscreen, rimosso PageShell scroll, nuovo HUD + BottomMenu, pannelli.
- `src/components/village/VillageMap.tsx` — rimosso MonsterThreatLayer, rimosso HUD interno, sfondo bioma, aggiunto EdgeFogLayer.
- `src/components/village/VillageMapViewport.tsx` — fullscreen height (`100dvh`), min-scale per coprire viewport, sfondo trasparente.
- `src/components/village/layers/TerrainLayer.tsx` — cintura decorativa sui bordi, fade radiale.
- `src/components/pikmin/VillagePikminLayer.tsx` — rimossa toolbar interna (resta solo il render dei pikmin); le preferenze diventano prop controllata.
- `src/lib/village/bonuses.ts` — aggiunto `sources` array.
- `src/lib/village/mapProjection.ts` — `WORLD_W=2400`, `WORLD_H=1600`.
- `src/components/admin/BuildingsEditor.tsx` — upload immagini per livello (5 slot).
- `src/components/BottomNav.tsx` o root layout — nascondere BottomNav su `/villaggio` (per fullscreen reale).

**Creare**
- `src/components/village/VillageBottomMenu.tsx`
- `src/components/village/panels/BuildPanel.tsx`
- `src/components/village/panels/DefensePanel.tsx`
- `src/components/village/panels/BonusPanel.tsx`
- `src/components/village/panels/AestheticsPanel.tsx`
- `src/components/village/panels/PikminPanel.tsx`
- `src/components/village/layers/EdgeFogLayer.tsx`
- `src/components/village/PlacementOverlay.tsx` — flusso scegli-posizione per costruzione.

**Rimuovere dalla scena (non i file)**
- `MonsterThreatLayer` dall'albero `VillageMap`.

## Note tecniche

- Nessuna modifica DB necessaria — `visual_stages jsonb[5]`, `building_catalog`, `computeVillageStatus` sono già pronti.
- `100dvh` per la safe-area iOS; bottom menu usa `pb-[env(safe-area-inset-bottom)]`.
- `Sheet` di shadcn (`src/components/ui/sheet.tsx`) come contenitore dei pannelli.
- Tutto resta frontend; nessun cambio di business logic se non l'aggregazione `sources` (additiva).

## Ordine di esecuzione

1. Layout fullscreen + nasconde BottomNav su `/villaggio`.
2. Mappa edge-to-edge + EdgeFogLayer + WORLD più grande.
3. Rimuovi MonsterThreatLayer + toolbar sprite dalla scena.
4. BottomMenu + 5 Sheet panels (stub funzionali).
5. BuildPanel con placement reale.
6. BonusPanel con sources aggregati.
7. AestheticsPanel assorbe controlli sprite.
8. BuildingsEditor: 5 slot immagini livello.
