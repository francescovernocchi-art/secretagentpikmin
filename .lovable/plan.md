# Modular Diorama RTS Engine — Piano

Obiettivo: il Villaggio smette di essere una tilemap procedural e diventa un **diorama statico HD** con **camera RTS mobile** e **overlay dinamici** (slot, edifici, Pikmin, eventi). Riferimento visivo: l'immagine allegata.

---

## 1. Database & Storage (Lovable Cloud)

**Bucket storage**: `village-dioramas` (pubblico in lettura, scrittura controllata).

**Tabella `village_dioramas`**
- `id`, `owner_id` (uuid, nullable per diorami di sistema), `family_id` (nullable)
- `biome` (text: forest/snow/volcanic/coast/industrial/space)
- `name`, `image_url`, `width` (int), `height` (int)
- `is_active` (bool), `is_system` (bool — preset condivisi)
- `created_at`, `updated_at`

**Tabella `village_diorama_slots`** (slot di costruzione per diorama)
- `id`, `diorama_id` (fk), `slot_key`
- `x`, `y` (coords nel sistema immagine), `size` (small/medium/large)
- `allowed_categories` (text[]) — es. `["base","lab","defense"]`

**RLS**: utente vede i propri diorami + quelli `is_system=true`; può editare solo i propri. Admin (via `has_role`) può tutto.

---

## 2. Storage upload flow

Pannello **Estetica → Gestione Diorama**:
- Upload da device (PNG/JPG/WebP, fino a 4096×4096)
- Lettura `naturalWidth/Height` lato client → salvataggio nel record
- Anteprima, sostituisci, elimina, set attivo, assegna bioma
- Auto-save su Supabase

---

## 3. Phaser engine — riscrittura `VillageScene.ts`

Il diorama è **una sola immagine HD**. Phaser NON genera tile, NON disegna terreno.

**Camera RTS mobile**
- World size = dimensioni reali immagine (es. 3072×3072)
- `camera.setBounds(0, 0, W, H)`
- Drag pan (pointer move con `pointer.isDown`)
- Pinch zoom (due dita, calcolo distanza)
- Wheel zoom desktop
- Zoom morbido (lerp), bounds zoom min/max
- API esterna: `focusOn(x,y)`, `focusBuilding(id)`, `recenter()`

**Layer order** (dal basso):
1. `bgLayer` — diorama PNG (statico, immutabile)
2. `slotLayer` — slot di costruzione (visibile solo in modalità build)
3. `buildingsLayer` — edifici overlay PNG con livelli/glow/ombre
4. `pikminLayer` — sprite Pikmin con movimento/path
5. `eventLayer` — overlay stagionali (neve, foglie, meteore…)
6. `fxLayer` — particelle, glow selezione

**UI fissa**: HUD React resta fuori dal canvas, non zoomata.

---

## 4. Sistema Slot

- Slot caricati da `village_diorama_slots` per il diorama attivo
- Nascosti normalmente
- In modalità "build" (placement attivo) si illuminano solo quelli compatibili con `placement.category`
- Tap su slot → emit `placeOnSlot(slotKey)` → React salva building con `position_x/y` derivate da slot

---

## 5. Edifici come overlay

- Niente più tilemap. Building = sprite PNG centrato su slot
- Stage visivi per livello (già esistenti in `building_catalog.visual_stages`)
- Glow/ombra morbida via Phaser blend modes
- Idle animation leggera (bobbing)

---

## 6. Pikmin

Mantenere `VillagePikminLayer` ma agganciato al world Phaser, non DOM. Convertirli in sprite Phaser dentro la scena per partecipare a camera/zoom. Movimento verso anchors (edifici nel world space).

---

## 7. Eventi modulari

Sistema `DioramaEventOverlay`:
- Registry di eventi (`halloween`, `christmas`, `meteor`, `invasion`)
- Ogni evento = componente Phaser che aggiunge sprite/particelle sopra `eventLayer`
- Attivabili da pannello Estetica o trigger temporale

---

## 8. Biomi

Enum + preset di diorami di sistema. Attivo subito: **🌿 Foresta**. Gli altri biomi restano selezionabili ma senza diorama preset finché non viene caricato.

---

## 9. UI — Pannello Estetica → Gestione Diorama

Nuova tab nel pannello Estetica:
- Lista diorami dell'utente + preset di sistema
- Upload widget
- Selettore bioma
- Editor slot visuale (modalità "edit slots": tap sul diorama per aggiungere/spostare slot) — **fase 2 opzionale**, per ora slot via DB

---

## Ordine di implementazione

1. Migration DB (`village_dioramas`, `village_diorama_slots`, bucket, RLS, policies)
2. Hook `useActiveDiorama` + `useDioramaSlots`
3. Refactor `VillageScene.ts`: rimuove tilemap, carica immagine, camera RTS, layer puliti
4. Sistema slot + overlay placement
5. Edifici come sprite overlay con stages
6. Pikmin dentro Phaser world
7. Pannello "Gestione Diorama" (upload + lista + set attivo)
8. Seed: 1 diorama di sistema "Foresta" (carico io l'immagine che hai allegato come preset iniziale, oppure attendo che tu la carichi dal pannello)

---

## Domande prima di partire

1. **Immagine foresta**: la uso come preset di sistema iniziale (la salvo io nel bucket) o vuoi caricarla tu dal nuovo pannello Estetica?
2. **Slot della foresta**: nell'immagine vedo 5 zone diamante. Li hardcodo come slot iniziali del preset, oppure preferisci un editor visuale per piazzarli tu?
3. **Pikmin nel canvas Phaser**: ok migrarli dentro Phaser (così zoomano con la mappa)? Oggi sono DOM React.
4. **Dimensione diorami**: target 3072×3072 o 4096×4096? Il secondo è più cinematografico ma pesa ~2× in banda mobile.

Rispondi a queste 4 e parto con migration + engine.