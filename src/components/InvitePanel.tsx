import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createInviteCode } from "@/lib/session";
import { toast } from "sonner";
import { Copy, Plus, Ticket, Loader2 } from "lucide-react";

type InviteRow = {
  id: string;
  code: string;
  used_by: string | null;
  used_at: string | null;
  note: string | null;
  created_at: string;
};

export function InvitePanel() {
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("invite_codes")
      .select("id,code,used_by,used_at,note,created_at")
      .order("created_at", { ascending: false });
    setRows((data as InviteRow[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const code = await createInviteCode(note.trim() || undefined);
      toast.success(`Codice creato: ${code}`);
      setNote("");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Codice copiato");
    } catch {
      toast.error("Copia non riuscita");
    }
  };

  return (
    <div className="panel-strong p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Ticket className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm uppercase tracking-widest text-primary">
          Inviti famiglia
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Genera un codice e condividilo solo con chi vuoi che entri nella base. Senza codice
        nessuno può registrarsi.
      </p>

      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (es. per zio Marco)"
          className="panel flex-1 px-3 py-2 bg-card/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60"
        />
        <button
          onClick={generate}
          disabled={busy}
          className="btn-neon px-3 py-2 text-xs flex items-center gap-1 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Crea
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground/70 text-center py-4">
            Nessun invito ancora.
          </p>
        )}
        {rows.map((r) => {
          const used = !!r.used_by;
          return (
            <div
              key={r.id}
              className={`panel p-3 flex items-center gap-2 ${used ? "opacity-50" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm tracking-widest text-primary">{r.code}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {used
                    ? `Usato ${r.used_at ? new Date(r.used_at).toLocaleDateString("it-IT") : ""}`
                    : r.note ?? "Disponibile"}
                </p>
              </div>
              {!used && (
                <button
                  onClick={() => copy(r.code)}
                  className="panel p-2 text-primary"
                  title="Copia"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
