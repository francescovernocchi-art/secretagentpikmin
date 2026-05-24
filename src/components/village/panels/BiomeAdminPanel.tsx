import { useState, useRef, useEffect } from "react";
import { Mountain, Plus, Trash2, Loader2, Save, X, Upload } from "lucide-react";
import { VillagePanelSheet } from "./VillagePanelSheet";
import { useAllCustomBiomes, type CustomBiomeRow } from "@/hooks/useCustomBiomes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged?: () => void;
}

type Draft = Omit<CustomBiomeRow, "id"> & { id?: string };

const empty = (): Draft => ({
  key: "",
  label: "",
  emoji: "🌍",
  image_url: null,
  tagline: "",
  bonuses: [],
  accent: "#7cd99a",
  sort_order: 100,
  is_active: true,
});

/** Pannello admin per creare/modificare/eliminare biomi custom (solo papa). */
export function BiomeAdminPanel({ open, onOpenChange, onChanged }: Props) {
  const { rows, loading, reload } = useAllCustomBiomes();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bonusInput, setBonusInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!open) setDraft(null); }, [open]);

  const startNew = () => setDraft(empty());
  const startEdit = (r: CustomBiomeRow) => setDraft({ ...r });

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Seleziona un'immagine"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8 MB"); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? "system";
      const ext = file.name.split(".").pop() ?? "png";
      const path = `biome-cover/${uid}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("village-dioramas")
        .upload(path, file, { upsert: false, cacheControl: "3600" });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("village-dioramas").getPublicUrl(path);
      setDraft((d) => d ? { ...d, image_url: pub.publicUrl } : d);
      toast.success("Immagine caricata");
    } catch (e: any) {
      toast.error("Upload fallito: " + e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async () => {
    if (!draft) return;
    const key = draft.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!key) { toast.error("Chiave obbligatoria (es. cyberpunk)"); return; }
    if (!draft.label.trim()) { toast.error("Nome obbligatorio"); return; }
    setSaving(true);
    const payload = {
      key,
      label: draft.label.trim(),
      emoji: draft.emoji || "🌍",
      image_url: draft.image_url,
      tagline: draft.tagline?.trim() || null,
      bonuses: draft.bonuses,
      accent: draft.accent || "#7cd99a",
      sort_order: draft.sort_order,
      is_active: draft.is_active,
    };
    const { error } = draft.id
      ? await supabase.from("village_biomes").update(payload).eq("id", draft.id)
      : await supabase.from("village_biomes").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(draft.id ? "Bioma aggiornato" : "Bioma creato");
    setDraft(null);
    await reload();
    onChanged?.();
  };

  const remove = async (r: CustomBiomeRow) => {
    if (!confirm(`Eliminare il bioma "${r.label}"?`)) return;
    const { error } = await supabase.from("village_biomes").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Bioma eliminato");
    await reload();
    onChanged?.();
  };

  const addBonus = () => {
    const v = bonusInput.trim();
    if (!v || !draft) return;
    setDraft({ ...draft, bonuses: [...draft.bonuses, v] });
    setBonusInput("");
  };
  const removeBonus = (i: number) => {
    if (!draft) return;
    setDraft({ ...draft, bonuses: draft.bonuses.filter((_, idx) => idx !== i) });
  };

  return (
    <VillagePanelSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Biomi Personalizzati"
      icon={<Mountain className="h-4 w-4 text-fuchsia-400" />}
    >
      <div className="space-y-4">
        {!draft && (
          <>
            <button onClick={startNew}
              className="btn-neon w-full py-2.5 text-xs inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> Nuovo bioma
            </button>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-primary">
                Biomi custom ({rows.length})
              </p>
              {loading && <p className="text-[11px] text-muted-foreground">Caricamento…</p>}
              {!loading && rows.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">
                  Nessun bioma custom. I biomi di sistema restano sempre disponibili.
                </p>
              )}
              {rows.map((r) => (
                <div key={r.id} className="panel p-2 flex items-center gap-2">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.label}
                      className="w-12 h-12 rounded object-cover" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded grid place-items-center text-xl"
                      style={{ background: r.accent + "33" }}>{r.emoji}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{r.emoji} {r.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.key} · {r.is_active ? "attivo" : "nascosto"}</p>
                  </div>
                  <button onClick={() => startEdit(r)}
                    className="text-[10px] px-2 py-1 rounded bg-primary/20 hover:bg-primary/30">
                    Modifica
                  </button>
                  <button onClick={() => remove(r)}
                    className="p-1.5 rounded bg-destructive/20 hover:bg-destructive/30">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {draft && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-primary">
                {draft.id ? "Modifica bioma" : "Nuovo bioma"}
              </p>
              <button onClick={() => setDraft(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block">
              <span className="text-[10px] text-muted-foreground">Chiave (univoca, lowercase)</span>
              <input value={draft.key}
                onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                placeholder="cyberpunk" disabled={!!draft.id}
                className="w-full px-2 py-1.5 rounded bg-background border border-border text-xs disabled:opacity-60" />
            </label>

            <div className="grid grid-cols-[60px_1fr] gap-2">
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Emoji</span>
                <input value={draft.emoji}
                  onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                  className="w-full px-2 py-1.5 rounded bg-background border border-border text-center" />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Nome</span>
                <input value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  placeholder="Cyberpunk City"
                  className="w-full px-2 py-1.5 rounded bg-background border border-border" />
              </label>
            </div>

            <label className="block">
              <span className="text-[10px] text-muted-foreground">Tagline</span>
              <input value={draft.tagline ?? ""}
                onChange={(e) => setDraft({ ...draft, tagline: e.target.value })}
                placeholder="Neon, droni e grattacieli"
                className="w-full px-2 py-1.5 rounded bg-background border border-border" />
            </label>

            <div>
              <span className="text-[10px] text-muted-foreground block mb-1">Immagine di copertina</span>
              {draft.image_url && (
                <img src={draft.image_url} alt="cover"
                  className="w-full aspect-video object-cover rounded mb-2" />
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
              <button disabled={uploading} onClick={() => fileRef.current?.click()}
                className="w-full px-3 py-1.5 rounded bg-primary/20 hover:bg-primary/30 inline-flex items-center justify-center gap-2 text-[11px]">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {draft.image_url ? "Sostituisci immagine" : "Carica immagine"}
              </button>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground block mb-1">Bonus (etichette)</span>
              <div className="flex flex-wrap gap-1 mb-1">
                {draft.bonuses.map((b, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 inline-flex items-center gap-1">
                    {b}
                    <button onClick={() => removeBonus(i)} className="opacity-70 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input value={bonusInput}
                  onChange={(e) => setBonusInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBonus(); } }}
                  placeholder="Es. Velocità"
                  className="flex-1 px-2 py-1 rounded bg-background border border-border text-[11px]" />
                <button onClick={addBonus} className="px-2 rounded bg-primary/20 hover:bg-primary/30 text-[11px]">
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Colore accento</span>
                <input type="color" value={draft.accent}
                  onChange={(e) => setDraft({ ...draft, accent: e.target.value })}
                  className="w-full h-9 rounded bg-background border border-border" />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Ordine</span>
                <input type="number" value={draft.sort_order}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 rounded bg-background border border-border" />
              </label>
            </div>

            <label className="flex items-center justify-between">
              <span>Attivo (visibile nella selezione)</span>
              <input type="checkbox" checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                className="accent-primary" />
            </label>

            <button disabled={saving} onClick={save}
              className="btn-neon w-full py-2 text-xs inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {draft.id ? "Salva modifiche" : "Crea bioma"}
            </button>
          </div>
        )}
      </div>
    </VillagePanelSheet>
  );
}
