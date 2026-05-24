import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { IconUploader } from "@/components/IconUploader";
import { PIKMIN_COLOR_DOT, type PikminType } from "@/data/pikminSprites";

const KEYS: PikminType[] = ["red", "blue", "yellow", "purple", "white"];

interface Row {
  key: PikminType;
  name: string;
  image_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function PikminCustomizerModal({ open, onClose, onSaved }: Props) {
  const isAdmin = getSession()?.role === "papa";
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("pikmin_species")
        .select("key, name, image_url")
        .in("key", KEYS);
      const map = new Map((data ?? []).map((d: any) => [d.key, d]));
      setRows(
        KEYS.map((k) => ({
          key: k,
          name: map.get(k)?.name ?? k,
          image_url: map.get(k)?.image_url ?? null,
        })),
      );
    })();
  }, [open]);

  if (!open) return null;

  const setRow = (k: PikminType, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    try {
      for (const r of rows) {
        const patch: any = { name: r.name.trim() || r.key };
        if (isAdmin) patch.image_url = r.image_url;
        const { error } = await supabase
          .from("pikmin_species")
          .update(patch)
          .eq("key", r.key);
        if (error) throw error;
      }
      onSaved?.();
      onClose();
    } catch (e) {
      alert("Salvataggio fallito: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel-strong p-4 w-full max-w-md flex flex-col gap-3 max-h-[90vh] overflow-y-auto animate-fade-in"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-base">Personalizza Pikmin</p>
          <button onClick={onClose} className="text-xs text-muted-foreground">✕</button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tutti i membri possono rinominare i Pikmin. {isAdmin
            ? "Come admin puoi anche cambiare l'icona."
            : "Solo l'admin può cambiare l'icona."}
        </p>

        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.key} className="panel p-2 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full border border-white/20 shrink-0"
                  style={{ background: PIKMIN_COLOR_DOT[r.key] }}
                />
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt={r.name}
                    className="w-10 h-10 object-contain shrink-0"
                  />
                ) : null}
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => setRow(r.key, { name: e.target.value })}
                  maxLength={32}
                  className="flex-1 bg-background/60 border border-white/10 rounded px-2 py-1 text-sm"
                  placeholder={`Nome Pikmin ${r.key}`}
                />
              </div>
              {isAdmin && (
                <div className="flex flex-col gap-1">
                  <IconUploader
                    label="Icona"
                    url={r.image_url ?? ""}
                    onUrl={(u) => setRow(r.key, { image_url: u })}
                    folder="pikmin"
                    pathHint={`type-${r.key}`}
                  />
                  <input
                    type="text"
                    value={r.image_url ?? ""}
                    onChange={(e) => setRow(r.key, { image_url: e.target.value })}
                    placeholder="oppure incolla URL icona"
                    className="bg-background/60 border border-white/10 rounded px-2 py-1 text-[11px]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-neon p-2 text-xs flex-1">Annulla</button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-neon p-2 text-xs flex-1 bg-primary/30 disabled:opacity-50"
          >
            {saving ? "Salvo…" : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
