# 🎨 Biome Editor — Piano di implementazione

Trasformiamo il sistema bioma in un editor completo, mobile-friendly, senza rompere diorama / Phaser / eventi / build system.

Lavoro grosso → lo spezzo in **5 fasi** indipendenti. Ti chiedo di confermare la fase 1 (fix UI + fondamenta DB), poi procediamo step-by-step. Così ogni step è verificabile.

---

## FASE 1 — Fix UI menu bioma + fondamenta DB (PRIMA COSA)

**Fix UI esistente (problema attuale)**
- Riscrivo `VillagePanelSheet` / `BiomeSelector` / `AestheticsPanel`:
  - z-index ordinato (sheet > overlay > canvas)
  - scroll container interno con `overflow-y-auto` + `overscroll-contain`
  - safe-area Android (`env(safe-area-inset-bottom)`)
  - tap targets ≥ 44px
  - chiusura tap-outside corretta
  - sheet sempre cliccabile sopra Phaser canvas

**Nuove tabelle DB**
- `village_structure_assets` (building_type, biome_key, level, asset_url, shadow_url, glow_url)
- Estensione `village_diorama_slots` con `width`, `height`, `rotation`, `allowed_categories[]` (se mancanti)
- RLS: lettura family, scrittura solo `papa`

**Nuova pagina admin: `/villaggio/editor/:biomeKey`**
- Layout a tab: Diorama · Slot · Strutture · Varianti · Bonus · Eventi
- Solo i tab Diorama + lista vuota; il resto arriva nelle fasi successive

---

## FASE 2 — Diorama Tab + Spawn Slot Editor visuale

**Diorama Tab**
- Upload immagine bioma (bucket `village-dioramas`)
- Preview con zoom
- Bounds camera (drag rect)

**Spawn Slot Editor (modalità editor Phaser)**
- Toggle "Modifica Spawn" → la `VillageScene` entra in `editorMode`:
  - gameplay in pausa (Pikmin idle, eventi sospesi)
  - tutti gli slot visibili con contorno glow + handle
- Interazioni:
  - tap su diorama → crea slot
  - drag → sposta
  - handle angoli → resize
  - tap slot → menu (categoria, elimina, rotazione)
- Persistenza live su `village_diorama_slots`

---

## FASE 3 — Structure Asset Manager + varianti per bioma

**Tab Strutture**
- Per ogni `building_catalog`:
  - griglia 5 slot upload (lv1 → lv5) per il bioma corrente
  - upload separato per shadow / glow opzionali
  - preview sovrapposta
- Hook `useStructureAssets(biome, type, level)`

**Phaser auto-selection**
- `VillageScene.spawnBuilding` legge `village_structure_assets` e sceglie l'asset corretto in base a `(biome, type, level)`
- Fallback: asset generico esistente

---

## FASE 4 — Tab Varianti + Bonus

**Varianti**
- Tag visivi per bioma (es. foresta: legno/foglie/muschio)
- Permettono N asset per stesso level (variante random/forzata)

**Bonus Tab**
- UI esistente `BonusPanel` integrata come tab
- Bonus bioma + struttura + stack + eventi

---

## FASE 5 — Tab Eventi

- Riuso `EventsAdminPanel` come tab
- Filtraggio per bioma corrente
- Preview overlay live

---

## 📐 Dettagli tecnici

**Tabelle nuove/modificate**
```sql
village_structure_assets (
  id uuid pk,
  building_type text,
  biome_key text,
  level int,
  variant text default 'default',
  asset_url text,
  shadow_url text,
  glow_url text,
  created_at timestamptz
)

ALTER village_diorama_slots
  ADD COLUMN width int default 96,
  ADD COLUMN height int default 96,
  ADD COLUMN rotation int default 0,
  ADD COLUMN allowed_categories text[] default '{}';
```

**Route**: `src/routes/villaggio.editor.$biome.tsx` (solo per `papa`)

**File nuovi (fase 1)**
- `src/routes/villaggio.editor.$biome.tsx`
- `src/components/village/editor/BiomeEditorTabs.tsx`
- `src/components/village/editor/DioramaTab.tsx` (placeholder)
- `src/hooks/useStructureAssets.ts`

**File modificati (fase 1)**
- `src/components/village/panels/VillagePanelSheet.tsx` (fix mobile)
- `src/components/village/BiomeSelector.tsx` (fix mobile + link "Editor")

---

## ⚠️ Cosa NON tocco

Diorama engine · camera RTS · eventi · build system · Pikmin · overlay · upgrade system. Tutte aggiunte sono additive.

---

## 🎯 Procedo con la FASE 1?

Confermi e parto con:
1. fix UI menu bioma (mobile)
2. migration DB
3. shell della route `/villaggio/editor/:biome` con i 6 tab (vuoti tranne intestazione)

Le fasi 2-5 le faremo una alla volta dopo aver visto la fase 1 funzionante. Va bene così?