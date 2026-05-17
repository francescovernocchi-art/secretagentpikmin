
# Archivio Pikmin & Nemici — piano di implementazione

Funzionalità grande: la divido in 4 step. Confermami se vuoi che proceda in un'unica volta o uno step alla volta.

## Cosa farò

### 1. Database (una sola migrazione)
Tabelle nuove con RLS "family open" (coerente col resto del progetto):

- `pikmin_species` — name, image_url, description, abilities[], resistances[], weaknesses[], first_appearance, exploration_use, combat_use, source_url, color, sort_order
- `enemies` — name, image_url, description, danger_level (1-5), habitat, behavior, speed, damage, spawn_probability (0-1), pikmin_eat_min, pikmin_eat_max, recommended_pikmin[], source_url
- `map_enemy_spawns` — enemy_id, lat, lng, radius_m, active, spawned_at, expires_at
- `battle_logs` — enemy_id, result (vittoria|sconfitta|fuga), pikmin_lost (jsonb per colore), rewards (jsonb), created_at, agent

Per l'inventario Pikmin **NON** creo una nuova tabella: estendo lo schema esistente. Oggi `pikmin_squad` ha un singolo contatore condiviso ("team"). Aggiungo colonna `breakdown jsonb` con conteggio per tipo (`{red: 5, yellow: 2, ...}`), aggiorno `adjust_pikmin` per accettare un tipo opzionale. Mantengo retrocompatibilità (vecchio counter resta la somma).

### 2. Seed dati da Pikipedia
Importo (script in `code--exec` + `insert`) i 9 Pikmin richiesti e ~10-12 nemici principali (Bulborbo Rosso/Maculato, Coleto, Smerlo Acquatico, Ranocchio Diafano, Bombafiamme, Aracnodio, Ragnemma, Drago Imperatore, Babborbo, Rospo Saltatore, ecc.). Ogni record con `source_url` alla pagina Pikipedia e `image_url` direttamente dal CDN della wiki (`pikminitalia.it/wiki/images/...`). Fallback con placeholder emoji se l'immagine non carica (gestito lato componente). I dati saranno modificabili da admin.

### 3. Pagine nuove
- **`/archivio`** — Archivio Pikmin: griglia card visual, search bar, filtri (abilità / resistenza), dialog dettagliato con tutte le info + link a Pikipedia. Stile "enciclopedia avventurosa" (panel-strong + glow, header coerente con app).
- **`/nemici`** — Archivio Nemici: stesso pattern, badge pericolosità 1-5, lista Pikmin consigliati, link fonte.
- **Admin editor** (solo `role === "papa"`) — pulsante "Modifica" nei dettagli, sheet con form per ogni campo (sia Pikmin che nemici). Niente pagina admin separata: editing inline.

Aggiungo le due voci nella `BottomNav` (o nel menu equivalente).

### 4. Spawn nemici su mappa + combattimento
In `src/routes/mappa.tsx`:
- Spawner casuale: ogni X secondi (configurabile, default 30s) tira un dado pesato su `spawn_probability` e crea una riga in `map_enemy_spawns` vicino al giocatore (raggio random 30-150m). Più forti = più rari.
- Render: icona/immagine del nemico sulla mappa.
- Toast/alert "⚠️ Un {nome} si aggira nella zona" + leggera vibrazione.
- Tap sul nemico → dialog **Battaglia**:
  - input quanti Pikmin per colore mandare (max = disponibili)
  - calcolo: HP nemico vs forza Pikmin con bonus/malus per tipo (es. blu +50% vs acquatici, rocciosi +100% vs corazzati, rossi resistenti al fuoco)
  - se vinci: XP + monete + (raro) seme/materiale, log con riepilogo
  - se perdi: nemico mangia tra `eat_min` e `eat_max` Pikmin (preferendo i tipi deboli), spendPikmin per tipo, log
  - riepilogo testuale: "Coleto ha mangiato 3 rossi e 1 giallo"
- Se il giocatore ignora un nemico per > 2 min e ha Pikmin nella squadra → attacco automatico (consuma pochi Pikmin).

### 5. Dettagli tecnici
- Componente `<EnemyImage>` / `<PikminImage>` con `onError` → placeholder emoji (mai blocca l'app).
- Footer "Fonte: [Pikipedia / PikminItalia](source_url) — CC BY-SA" in ogni scheda dettagliata.
- Realtime: `map_enemy_spawns` via supabase channels così entrambi gli agenti vedono gli stessi spawn.
- Non tocco le pagine esistenti se non `mappa.tsx` e la nav.

## Cosa NON farò (per evitare scope creep)
- Non importerò automaticamente *tutti* i nemici della wiki (centinaia di voci) — parto con i 10-12 principali, poi sarà l'admin ad aggiungerne altri dal form.
- Non implemento upload di immagini custom (uso URL diretti).
- Niente sistema di crafting nuovo: i "materiali" finiscono come ingredienti esistenti.

## Conferma
Vuoi che proceda tutto in una sola volta o preferisci splittare (es. prima archivio + dati, poi spawn/battaglia in un secondo turno)?
