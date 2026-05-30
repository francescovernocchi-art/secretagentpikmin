import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Trash2, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStructureAssets, type StructureAsset } from "@/hooks/useStructureAssets";
import { useActiveDiorama } from "@/hooks/useActiveDiorama";
import { uploadAsset } from "@/lib/admin-upload";
import { Slider } from "@/components/ui/slider";
import { StructurePreview } from "./StructurePreview";

interface Props {
  biomeKey: string;
}

interface BuildingCatalogRow {
  key: string;
  name: string;
  emoji: string | null;
  category: string | null;
  max_level: number;
}

const LEVELS = [1, 2, 3, 4, 5];
const IDLE_OPTIONS = ["none", "bob", "sway"] as const;

interface DraftAsset {
  asset_url: string | null;
  shadow_url: string | null;
  glow_url: string | null;
  slot_fit_scale: number;
  anchor_x: number;
  anchor_y: number;
  offset_x: number;
  offset_y: number;
  idle_anim: string;
}

const EMPTY_DRAFT: DraftAsset = {
  asset_url: null,
  shadow_url: null,
  glow_url: null,
  slot_fit_scale: 0.9,
  anchor_x: 0.5,
  anchor_y: 1.0,
  offset_x: 0,
  offset_y: 0,
  idle_anim: "none",
};

function draftFrom(a: StructureAsset | null): DraftAsset {
  if (!a) return { ...EMPTY_DRAFT };
  return {
    asset_url: a.asset_url,
    shadow_url: a.shadow_url,
    glow_url: a.glow_url,
    slot_fit_scale: a.slot_fit_scale,
    anchor_x: a.anchor_x,
    anchor_y: a.anchor_y,
    offset_x: a.offset_x,
    offset_y: a.offset_y,
    idle_anim: a.idle_anim,
  };
}

export function StructuresTab({ biomeKey }: Props) {
  const { assets, loading, reload, upsertAsset, deleteAsset } = useStructureAssets(biomeKey);
  const { diorama } = useActiveDiorama(biomeKey);
  const [catalog, setCatalog] = useState<BuildingCatalogRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [level, setLevel] = useState<number>(1);
  const [draft, setDraft] = useState<DraftAsset>({ ...EMPTY_DRAFT });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    supabase
      .from("building_catalog")
      .select("key,name,emoji,category,max_level")
      .order("sort_order")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error("Catalogo non caricato: " + error.message);
        const rows = (data ?? []) as BuildingCatalogRow[];
        setCatalog(rows);
        if (rows.length && !selectedType) setSelectedType(rows[0].key);
        setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentAsset = useMemo(
    () =>
      assets.find(
        (a) =>
          a.building_type === selectedType &&
          a.biome_key === biomeKey &&
          a.level === level &&
          a.variant === "default",
      ) ?? null,
    [assets, selectedType, biomeKey, level],
  );

  useEffect(() => {
    setDraft(draftFrom(currentAsset));
  }, [currentAsset]);

  const handleUpload = async (kind: "asset_url" | "shadow_url" | "glow_url", file: File) => {
    setBusy(true);
    try {
      const url = await uploadAsset(
        "building-images",
        file,
        `${biomeKey}-${selectedType}-l${level}-${kind}`,
      );
      setDraft((d) => ({ ...d, [kind]: url }));
      toast.success("Upload completato");
    } catch (e: any) {
      toast.error("Upload fallito: " + (e?.message ?? "errore"));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!selectedType) return;
    if (!draft.asset_url) {
      toast.error("Carica prima l'immagine principale della struttura");
      return;
    }
    setBusy(true);
    try {
      await upsertAsset({
        building_type: selectedType,
        biome_key: biomeKey,
        level,
        variant: "default",
        ...draft,
        asset_url: draft.asset_url,
      });
      await reload();
      toast.success(`Salvato: ${selectedType} lv${level}`);
    } catch (e: any) {
      toast.error("Salvataggio fallito: " + (e?.message ?? "errore"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!currentAsset) return;
    if (!confirm("Eliminare questo asset?")) return;
    setBusy(true);
    try {
      await deleteAsset(currentAsset.id);
      await reload();
      toast.success("Asset eliminato");
    } catch (e: any) {
      toast.error("Eliminazione fallita: " + (e?.message ?? "errore"));
    } finally {
      setBusy(false);
    }
  };

  if (catalogLoading || loading) {
    return <p className="text-xs text-muted-foreground">Caricamento strutture…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="panel p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-primary">Edificio</p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
          {catalog.map((c) => {
            const on = c.key === selectedType;
            return (
              <button
                key={c.key}
                onClick={() => setSelectedType(c.key)}
                className={`shrink-0 px-3 min-h-[40px] rounded-xl border text-xs inline-flex items-center gap-1.5 ${
                  on
                    ? "bg-primary/25 border-primary text-primary"
                    : "bg-card/40 border-border/50 text-muted-foreground"
                }`}
              >
                <span>{c.emoji ?? "🏠"}</span>
                <span className="truncate max-w-[100px]">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-primary">Livello</p>
        <div className="grid grid-cols-5 gap-1.5">
          {LEVELS.map((lv) => {
            const has = assets.some(
              (a) => a.building_type === selectedType && a.level === lv && a.variant === "default",
            );
            const on = lv === level;
            return (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                className={`min-h-[44px] rounded-lg border text-xs inline-flex flex-col items-center justify-center ${
                  on
                    ? "bg-primary/25 border-primary text-primary"
                    : "bg-card/40 border-border/50"
                }`}
              >
                lv{lv}
                {has && <span className="text-[9px] text-emerald-400">●</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* PREVIEW */}
        <div className="panel p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary">Preview slot</p>
          <StructurePreview
            assetUrl={draft.asset_url}
            shadowUrl={draft.shadow_url}
            glowUrl={draft.glow_url}
            slotFitScale={draft.slot_fit_scale}
            anchorX={draft.anchor_x}
            anchorY={draft.anchor_y}
            offsetX={draft.offset_x}
            offsetY={draft.offset_y}
            dioramaUrl={diorama?.image_url ?? null}
          />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <span className="text-amber-300 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Tips:
            </span>{" "}
            PNG trasparente, niente margini, ombra/glow su layer separati, anchor di default
            <code className="mx-1 rounded bg-black/40 px-1">bottom-center</code>.
          </p>
        </div>

        {/* CONTROLS */}
        <div className="panel p-3 space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-primary">Asset</p>
            <UploadRow
              label="Struttura PNG"
              value={draft.asset_url}
              onUpload={(f) => handleUpload("asset_url", f)}
              onClear={() => setDraft((d) => ({ ...d, asset_url: null }))}
            />
            <UploadRow
              label="Ombra (opz.)"
              value={draft.shadow_url}
              onUpload={(f) => handleUpload("shadow_url", f)}
              onClear={() => setDraft((d) => ({ ...d, shadow_url: null }))}
            />
            <UploadRow
              label="Glow (opz.)"
              value={draft.glow_url}
              onUpload={(f) => handleUpload("glow_url", f)}
              onClear={() => setDraft((d) => ({ ...d, glow_url: null }))}
            />
          </div>

          <SliderRow
            label="Scala fit allo slot"
            value={draft.slot_fit_scale}
            min={0.5}
            max={1.2}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => setDraft((d) => ({ ...d, slot_fit_scale: v }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <SliderRow
              label="Anchor X"
              value={draft.anchor_x}
              min={0}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={(v) => setDraft((d) => ({ ...d, anchor_x: v }))}
            />
            <SliderRow
              label="Anchor Y"
              value={draft.anchor_y}
              min={0}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={(v) => setDraft((d) => ({ ...d, anchor_y: v }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SliderRow
              label="Offset X (px)"
              value={draft.offset_x}
              min={-64}
              max={64}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => setDraft((d) => ({ ...d, offset_x: Math.round(v) }))}
            />
            <SliderRow
              label="Offset Y (px)"
              value={draft.offset_y}
              min={-64}
              max={64}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => setDraft((d) => ({ ...d, offset_y: Math.round(v) }))}
            />
          </div>

          <label className="block text-xs">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Idle animation
            </span>
            <select
              value={draft.idle_anim}
              onChange={(e) => setDraft((d) => ({ ...d, idle_anim: e.target.value }))}
              className="mt-1 w-full min-h-[40px] rounded-lg border border-border bg-background px-2"
            >
              {IDLE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={busy}
              className="btn-neon min-h-[44px] text-xs inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salva lv{level}
            </button>
            <button
              onClick={handleDelete}
              disabled={busy || !currentAsset}
              className="min-h-[44px] rounded-lg border border-destructive/50 bg-destructive/15 text-xs text-destructive inline-flex items-center justify-center gap-1.5 disabled:opacity-30"
            >
              <Trash2 className="h-3.5 w-3.5" /> Elimina
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadRow({
  label,
  value,
  onUpload,
  onClear,
}: {
  label: string;
  value: string | null;
  onUpload: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {value ? (
        <img
          src={value}
          alt=""
          className="h-12 w-12 rounded-md border border-border object-contain bg-black/40"
        />
      ) : (
        <div className="h-12 w-12 rounded-md border border-dashed border-border grid place-items-center text-[9px] text-muted-foreground">
          vuoto
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] truncate">{label}</p>
        <div className="flex gap-1.5 mt-1">
          <label className="panel min-h-[32px] px-2 text-[10px] inline-flex items-center gap-1 cursor-pointer">
            <Upload className="h-3 w-3" />
            <span>Carica</span>
            <input
              type="file"
              accept="image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button
              onClick={onClear}
              className="min-h-[32px] px-2 text-[10px] rounded border border-border text-muted-foreground"
            >
              Rimuovi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="text-primary font-mono">{format(value)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </label>
  );
}
