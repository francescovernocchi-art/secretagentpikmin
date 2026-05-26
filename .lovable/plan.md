# 🏛️ Sistema Scala Edifici + Integrazione Diorama

Obiettivo: gli edifici sembrano parte naturale del diorama, non PNG incollati. Lavoro additivo, niente di rotto.

---

## FASE A — Schema DB (parametri visivi per edificio/bioma/livello)

Estendo `village_structure_assets` con i campi di fit/anchor/offset:

```sql
ALTER TABLE village_structure_assets
  ADD COLUMN slot_fit_scale numeric default 0.9,   -- 0.5..1.2 (target % dello slot)
  ADD COLUMN anchor_x numeric default 0.5,         -- 0..1 (default bottom-center)
  ADD COLUMN anchor_y numeric default 1.0,
  ADD COLUMN offset_x int default 0,               -- px in coord world
  ADD COLUMN offset_y int default 0,
  ADD COLUMN idle_anim text default 'none';        -- 'none' | 'bob' | 'sway'
```

`shadow_url` / `glow_url` già esistono. RLS già a posto (lettura family, scrittura `papa`).

---

## FASE B — Editor admin "Structures Tab"

Sostituisco il placeholder `structures` nel `BiomeEditorTabs` con `StructuresTab.tsx`:

- Lista `building_catalog` (filtrabile)
- Per ogni edificio × livello (lv1..lv5):
  - upload PNG struttura (bucket `building-images`)
  - upload PNG ombra (opz.)
  - upload PNG glow (opz.)
  - slider `slot_fit_scale` 0.5..1.2 step 0.05
  - slider `offset_x` / `offset_y` -64..64
  - select `idle_anim` (none/bob/sway)
  - mini-preview LIVE: l'asset renderizzato dentro un finto slot con bordo glow, alla scala/offset correnti, su sfondo diorama del bioma
- Pulsante "Salva" per livello → upsert su `village_structure_assets`

Hook esistente `useStructureAssets(biome)` già caricato → aggiungo `.upsert()` helper.

---

## FASE C — Phaser rendering coerente con slot

Modifico `VillageScene.spawnBuilding` (e simili):

```text
slotW, slotH = slot.width, slot.height           (dai dati slot)
asset = useStructureAssets.pick(type, level)     (con fallback)
baseScale = min(slotW/imgW, slotH/imgH) * asset.slot_fit_scale
sprite.setOrigin(asset.anchor_x, asset.anchor_y)
sprite.setPosition(slot.x + offset_x, slot.y + offset_y)
sprite.setScale(baseScale)
sprite.setDepth(sprite.y)                        (depth = y per ordinamento naturale)

if asset.shadow_url → shadow sprite SOTTO (depth = sprite.depth - 1, alpha 0.5, scale leggermente più ampio)
if asset.glow_url   → glow sprite SOPRA (additive blend, depth = sprite.depth + 1)
if asset.idle_anim != 'none' → tween morbido (bob = ±2px Y, sway = ±1° rotation)
```

Nessuna modifica al sistema slot, camera, build, eventi, Pikmin, overlay.

---

## FASE D — Coerenza visiva diorama

Linee guida documentate in `StructuresTab` (testo informativo per admin):
- stessa direzione luce del diorama (suggerimento testuale)
- ombra morbida separata, non hard
- bottom-center per anchor di default
- niente bordi neri/margini inutili nel PNG
- struttura grande nel canvas (no whitespace)

Non posso forzare in codice la coerenza artistica, ma il preview live mostra
subito se l'asset stona col diorama, così l'admin può correggere prima di salvare.

---

## 📁 File

**Nuovi**
- `src/components/village/editor/StructuresTab.tsx`
- `src/components/village/editor/StructurePreview.tsx` (preview live su diorama)

**Modificati**
- `src/components/village/editor/BiomeEditorTabs.tsx` (rimuovo placeholder structures)
- `src/routes/villaggio.editor.$biome.tsx` (monta StructuresTab)
- `src/hooks/useStructureAssets.ts` (aggiungo `upsertAsset()`)
- `src/game/village/VillageScene.ts` (rendering con fit/offset/anchor/depth/shadow/glow/idle)

**Migration**
- ALTER `village_structure_assets` (5 colonne nuove con default)

---

## ⚠️ Cosa NON tocco
Diorama engine · camera RTS · build system · eventi · Pikmin · overlay · upgrade system · slot editor (Fase 2 già pronta).

---

## 🎯 Procedo?

Confermo e parto con migration + StructuresTab + rendering Phaser in un unico round. Test su un edificio campione (es. `command_center`) per validare il fit visivo.
