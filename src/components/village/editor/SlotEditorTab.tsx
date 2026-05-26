import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { AlertTriangle, Check, Copy, Loader2, Move, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDioramaLibrary, type DioramaRow, type DioramaSlot } from "@/hooks/useActiveDiorama";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

interface Props {
  biomeKey: string;
}

type SlotDraft = Omit<DioramaSlot, "created_at" | "size"> & { legacy?: boolean };
type SlotRow = Tables<"village_diorama_slots">;
type SlotInsert = TablesInsert<"village_diorama_slots">;
type SlotUpdate = TablesUpdate<"village_diorama_slots">;
type DragMode = "move" | "resize";

const CATEGORIES = ["base", "lab", "defense", "farm", "mine", "decoration"];
const MIN_SIZE = 36;

export function SlotEditorTab({ biomeKey }: Props) {
  const { items, loading, reload } = useDioramaLibrary(biomeKey);
  const activeDiorama = useMemo(() => items.find((d) => d.is_active) ?? items[0] ?? null, [items]);
  const [dioramaId, setDioramaId] = useState<string | null>(null);
  const diorama = items.find((d) => d.id === (dioramaId ?? activeDiorama?.id)) ?? activeDiorama;
  const [slots, setSlots] = useState<SlotDraft[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    mode: DragMode;
    pointerId: number;
    startX: number;
    startY: number;
    slot: SlotDraft;
    latest: SlotDraft;
  } | null>(null);

  const selected = slots.find((s) => s.id === selectedId) ?? null;
  const legacySlots = slots.filter((s) => s.legacy);

  useEffect(() => {
    if (!dioramaId && activeDiorama) setDioramaId(activeDiorama.id);
  }, [activeDiorama, dioramaId]);

  useEffect(() => {
    if (!diorama) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setBusy(true);
    supabase
      .from("village_diorama_slots")
      .select("*")
      .eq("diorama_id", diorama.id)
      .order("slot_key")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error("Slot non caricati: " + error.message);
        setSlots(((data ?? []) as SlotRow[]).map(normalizeSlot));
        setSelectedId(null);
        setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [diorama]);

  const viewToWorld = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || !diorama) return null;
    return {
      x: clamp(Math.round(((clientX - rect.left) / rect.width) * diorama.width), 0, diorama.width),
      y: clamp(
        Math.round(((clientY - rect.top) / rect.height) * diorama.height),
        0,
        diorama.height,
      ),
    };
  };

  const updateSlotLocal = (id: string, patch: Partial<SlotDraft>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const persistSlot = async (slot: SlotDraft, successMessage = "Slot salvato") => {
    setSavingId(slot.id);
    const payload: SlotUpdate = {
      slot_key: slot.slot_key.trim() || slot.id.slice(0, 8),
      x: Math.round(slot.x),
      y: Math.round(slot.y),
      width: Math.round(slot.width || 96),
      height: Math.round(slot.height || 96),
      rotation: Math.round(slot.rotation || 0),
      allowed_categories: slot.allowed_categories,
    };

    const { error } = await supabase
      .from("village_diorama_slots")
      .update(payload)
      .eq("id", slot.id);
    setSavingId(null);
    if (error) {
      toast.error("Salvataggio fallito: " + error.message);
      return false;
    }
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, ...payload, legacy: false } : s)),
    );
    toast.success(successMessage);
    return true;
  };

  const createSlot = async (clientX: number, clientY: number) => {
    if (!diorama || busy) return;
    const p = viewToWorld(clientX, clientY);
    if (!p) return;
    const n = slots.length + 1;
    const slotKey = nextSlotKey(slots, biomeKey, n);
    const payload: SlotInsert = {
      diorama_id: diorama.id,
      biome_key: biomeKey,
      slot_key: slotKey,
      x: clamp(p.x - 48, 0, diorama.width - 96),
      y: clamp(p.y - 48, 0, diorama.height - 96),
      width: 96,
      height: 96,
      rotation: 0,
      allowed_categories: ["base"],
    };
    const { data, error } = await supabase
      .from("village_diorama_slots")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      toast.error("Creazione slot fallita: " + error.message);
      return;
    }
    const created = normalizeSlot(data);
    setSlots((prev) => [...prev, created].sort((a, b) => a.slot_key.localeCompare(b.slot_key)));
    setSelectedId(created.id);
  };

  const createCenteredSlot = () => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    createSlot(rect.left + rect.width / 2, rect.top + rect.height / 2);
  };

  const saveSlot = async (slot: SlotDraft) => {
    await persistSlot(slot);
  };

  const normalizeLegacySlots = async () => {
    if (legacySlots.length === 0) return;
    setBusy(true);
    const updates = await Promise.all(
      legacySlots.map((slot) =>
        supabase
          .from("village_diorama_slots")
          .update({
            biome_key: biomeKey,
            width: Math.round(slot.width || 96),
            height: Math.round(slot.height || 96),
            rotation: Math.round(slot.rotation || 0),
          } satisfies SlotUpdate)
          .eq("id", slot.id),
      ),
    );
    setBusy(false);
    const failed = updates.find((r) => r.error);
    if (failed?.error) {
      toast.error("Normalizzazione fallita: " + failed.error.message);
      return;
    }
    setSlots((prev) =>
      prev.map((slot) =>
        slot.legacy
          ? {
              ...slot,
              biome_key: biomeKey,
              width: slot.width || 96,
              height: slot.height || 96,
              legacy: false,
            }
          : slot,
      ),
    );
    toast.success("Slot legacy normalizzati");
  };

  const deleteSlot = async (slot: SlotDraft) => {
    if (!confirm(`Eliminare lo slot "${slot.slot_key}"?`)) return;
    const { error } = await supabase.from("village_diorama_slots").delete().eq("id", slot.id);
    if (error) {
      toast.error("Eliminazione fallita: " + error.message);
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== slot.id));
    setSelectedId(null);
  };

  const startDrag = (event: PointerEvent<HTMLElement>, slot: SlotDraft, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();
    const p = viewToWorld(event.clientX, event.clientY);
    if (!p) return;
    setSelectedId(slot.id);
    dragRef.current = {
      id: slot.id,
      mode,
      pointerId: event.pointerId,
      startX: p.x,
      startY: p.y,
      slot,
      latest: slot,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || !diorama) return;
    const p = viewToWorld(event.clientX, event.clientY);
    if (!p) return;
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    if (drag.mode === "move") {
      const next = {
        ...drag.slot,
        x: clamp(Math.round(drag.slot.x + dx), 0, diorama.width - drag.slot.width),
        y: clamp(Math.round(drag.slot.y + dy), 0, diorama.height - drag.slot.height),
      };
      drag.latest = next;
      updateSlotLocal(drag.id, next);
    } else {
      const next = {
        ...drag.slot,
        width: clamp(Math.round(drag.slot.width + dx), MIN_SIZE, diorama.width - drag.slot.x),
        height: clamp(Math.round(drag.slot.height + dy), MIN_SIZE, diorama.height - drag.slot.y),
      };
      drag.latest = next;
      updateSlotLocal(drag.id, next);
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(drag.pointerId);
    } catch {
      /* ignore */
    }
    if (drag.latest.legacy) {
      persistSlot(drag.latest, "Slot legacy riallineato");
    }
  };

  if (loading) return <p className="text-xs text-muted-foreground">Caricamento diorami...</p>;
  if (!diorama) {
    return (
      <div className="panel p-6 text-center text-xs text-muted-foreground">
        Prima carica o attiva un diorama per questo bioma.
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={diorama.id}
            onChange={(e) => setDioramaId(e.target.value)}
            className="min-h-[40px] flex-1 rounded-lg border border-border bg-background px-3 text-xs"
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name ?? "Diorama"}
                {item.is_active ? " - attivo" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={reload}
            className="panel min-h-[40px] px-3 text-xs inline-flex items-center gap-1.5"
          >
            <Loader2 className="h-3.5 w-3.5" /> Ricarica
          </button>
          <button
            onClick={normalizeLegacySlots}
            disabled={legacySlots.length === 0 || busy}
            className="panel min-h-[40px] px-3 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" /> Normalizza slot legacy
          </button>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100 inline-flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span>
            Gli slot importati da versioni precedenti possono richiedere riallineamento manuale.
          </span>
        </div>

        <div
          ref={stageRef}
          className="relative overflow-hidden rounded-lg border border-primary/30 bg-black touch-none"
          style={{ aspectRatio: `${diorama.width} / ${diorama.height}` }}
          onPointerDown={(e) => {
            if (e.target !== e.currentTarget) return;
            createSlot(e.clientX, e.clientY);
          }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            src={diorama.image_url}
            alt={diorama.name ?? "Diorama"}
            className="absolute inset-0 h-full w-full object-fill select-none pointer-events-none"
            draggable={false}
          />
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-black/30 text-xs">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {slots.map((slot) => {
            const on = slot.id === selectedId;
            const style = slotStyle(slot, diorama);
            return (
              <button
                key={slot.id}
                type="button"
                onPointerDown={(e) => startDrag(e, slot, "move")}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(slot.id);
                }}
                className={`absolute border-2 text-[10px] font-semibold text-white shadow-lg ${on ? "border-primary bg-primary/35" : "border-white/70 bg-black/25"}`}
                style={style}
                title={slot.slot_key}
              >
                <span className="absolute left-1 top-1 rounded bg-black/65 px-1">
                  {slot.slot_key}
                </span>
                {slot.legacy && (
                  <span className="absolute right-1 top-1 rounded bg-amber-400 px-1 text-[9px] text-black">
                    Legacy
                  </span>
                )}
                <Move className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 opacity-80" />
                <span
                  role="presentation"
                  onPointerDown={(e) => startDrag(e, slot, "resize")}
                  className="absolute bottom-0 right-0 h-5 w-5 translate-x-1/2 translate-y-1/2 rounded-full border border-white bg-primary"
                />
              </button>
            );
          })}
        </div>
      </section>

      <aside className="panel p-3 space-y-3 h-fit">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary">Slot editor</p>
            <p className="text-[11px] text-muted-foreground">{slots.length} slot nel diorama</p>
          </div>
          <button
            onClick={createCenteredSlot}
            className="btn-neon min-h-[36px] px-3 text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Slot
          </button>
        </div>

        {!selected && (
          <p className="text-xs text-muted-foreground">
            Tocca il diorama per creare uno slot, poi trascinalo o usa il pallino per
            ridimensionarlo.
          </p>
        )}
        {selected && (
          <div className="space-y-3 text-xs">
            {selected.legacy && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1.5 text-[10px] text-amber-100">
                Legacy: trascina o ridimensiona lo slot, il riallineamento verrà salvato subito.
              </div>
            )}
            <label className="block">
              <span className="text-[10px] text-muted-foreground">Chiave slot</span>
              <input
                value={selected.slot_key}
                onChange={(e) => updateSlotLocal(selected.id, { slot_key: e.target.value })}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-2"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              {(["x", "y", "width", "height"] as const).map((key) => (
                <label key={key} className="block">
                  <span className="text-[10px] text-muted-foreground">{key}</span>
                  <input
                    type="number"
                    value={selected[key]}
                    onChange={(e) =>
                      updateSlotLocal(selected.id, { [key]: Number(e.target.value) || 0 })
                    }
                    className="mt-1 w-full rounded border border-border bg-background px-2 py-2"
                  />
                </label>
              ))}
            </div>

            <label className="block">
              <span className="text-[10px] text-muted-foreground">Rotazione</span>
              <input
                type="number"
                value={selected.rotation}
                onChange={(e) =>
                  updateSlotLocal(selected.id, { rotation: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded border border-border bg-background px-2 py-2"
              />
            </label>

            <div className="rounded-lg border border-border/60 bg-black/20 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
              x={Math.round(selected.x)} y={Math.round(selected.y)}
              <br />
              width={Math.round(selected.width)} height={Math.round(selected.height)}
              <br />
              rotation={Math.round(selected.rotation || 0)}
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Categorie ammesse</p>
              <div className="grid grid-cols-2 gap-1">
                {CATEGORIES.map((cat) => {
                  const checked = selected.allowed_categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() =>
                        updateSlotLocal(selected.id, {
                          allowed_categories: checked
                            ? selected.allowed_categories.filter((c) => c !== cat)
                            : [...selected.allowed_categories, cat],
                        })
                      }
                      className={`min-h-[34px] rounded border px-2 text-[10px] inline-flex items-center justify-center gap-1 ${checked ? "border-primary bg-primary/25 text-primary" : "border-border bg-card/30"}`}
                    >
                      {checked ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-50" />
                      )}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={savingId === selected.id}
                onClick={() => saveSlot(selected)}
                className="btn-neon min-h-[40px] text-xs inline-flex items-center justify-center gap-1.5"
              >
                {savingId === selected.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salva
              </button>
              <button
                onClick={() => deleteSlot(selected)}
                className="min-h-[40px] rounded-lg border border-destructive/50 bg-destructive/15 text-xs text-destructive inline-flex items-center justify-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Elimina
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function normalizeSlot(row: SlotRow): SlotDraft {
  const raw = row as SlotRow & { width?: number | null; height?: number | null };
  const legacy = raw.width == null || raw.height == null || row.biome_key == null;
  const fallback = row.size === "large" ? 128 : row.size === "small" ? 76 : 96;
  return {
    id: row.id,
    diorama_id: row.diorama_id,
    biome_key: row.biome_key ?? null,
    slot_key: row.slot_key,
    x: Number(row.x) || 0,
    y: Number(row.y) || 0,
    width: Number(raw.width) || fallback,
    height: Number(raw.height) || fallback,
    rotation: Number(row.rotation) || 0,
    allowed_categories: Array.isArray(row.allowed_categories) ? row.allowed_categories : [],
    legacy,
  };
}

function slotStyle(slot: SlotDraft, diorama: DioramaRow): CSSProperties {
  return {
    left: `${(slot.x / diorama.width) * 100}%`,
    top: `${(slot.y / diorama.height) * 100}%`,
    width: `${(slot.width / diorama.width) * 100}%`,
    height: `${(slot.height / diorama.height) * 100}%`,
    transform: `rotate(${slot.rotation || 0}deg)`,
    transformOrigin: "center",
  };
}

function nextSlotKey(slots: SlotDraft[], biomeKey: string, start: number) {
  const used = new Set(slots.map((s) => s.slot_key));
  let n = start;
  let key = `${biomeKey}_slot_${String(n).padStart(2, "0")}`;
  while (used.has(key)) {
    n += 1;
    key = `${biomeKey}_slot_${String(n).padStart(2, "0")}`;
  }
  return key;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
