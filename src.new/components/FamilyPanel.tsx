import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createFamilyMember } from "@/lib/admin-users.functions";
import { generateMemorablePassword, type Role } from "@/lib/session";
import { toast } from "sonner";
import { Copy, Plus, Users, Loader2, ShieldCheck, RefreshCw } from "lucide-react";

type Member = {
  user_id: string;
  name: string;
  emoji: string;
  agent_key: Role;
};

const EMOJIS = ["🕶️", "🥷", "🛰️", "🐺", "🦊", "🤖", "🧑‍🚀", "🦉", "🐉"];

export function FamilyPanel() {
  const create = useServerFn(createFamilyMember);
  const [members, setMembers] = useState<Member[]>([]);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("lorenzo");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [password, setPassword] = useState(generateMemorablePassword());
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ username: string; password: string } | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id,name,emoji,agent_key")
      .order("created_at", { ascending: true });
    setMembers((data as Member[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (busy) return;
    const u = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{2,32}$/.test(u)) {
      toast.error("Nome agente: solo minuscole, numeri e _ (2-32)");
      return;
    }
    if (!name.trim()) {
      toast.error("Inserisci il nome visualizzato");
      return;
    }
    if (password.length < 8) {
      toast.error("Password troppo corta");
      return;
    }
    setBusy(true);
    try {
      await create({ data: { username: u, password, name: name.trim(), role, emoji } });
      setLast({ username: u, password });
      toast.success("Agente creato. Condividi le credenziali a voce.");
      setUsername("");
      setName("");
      setPassword(generateMemorablePassword());
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Errore");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Copiato");
    } catch {
      toast.error("Copia non riuscita");
    }
  };

  return (
    <div className="panel-strong p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm uppercase tracking-widest text-primary">
          Agenti della famiglia
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Crea tu stesso ogni agente: scegli nome, password e ruolo. Solo tu (Comandante)
        entri con email; gli altri usano nome agente + password.
      </p>

      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {members.length === 0 && (
          <p className="text-xs text-muted-foreground/70 text-center py-2">Nessun agente ancora.</p>
        )}
        {members.map((m) => (
          <div key={m.user_id} className="panel p-2 flex items-center gap-2">
            <span className="text-lg">{m.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{m.name}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                {m.agent_key === "papa" ? (
                  <>
                    <ShieldCheck className="h-3 w-3 text-primary" /> Comandante
                  </>
                ) : (
                  "Operativo"
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="panel p-3 flex flex-col gap-2 bg-card/30">
        <p className="text-[10px] uppercase tracking-widest text-primary">Nuovo agente</p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
          placeholder="nome_agente (login)"
          className="px-3 py-2 bg-night/60 rounded-lg border border-primary/20 text-sm"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome visualizzato"
          className="px-3 py-2 bg-night/60 rounded-lg border border-primary/20 text-sm"
        />
        <div className="flex gap-2">
          {(["lorenzo", "papa"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 panel py-2 text-[10px] uppercase tracking-widest ${role === r ? "border-primary text-primary" : "text-muted-foreground"}`}
            >
              {r === "papa" ? "Comandante" : "Operativo"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`h-9 w-9 rounded-lg panel text-lg ${emoji === e ? "border-primary glow-soft" : ""}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 px-3 py-2 bg-night/60 rounded-lg border border-primary/20 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => setPassword(generateMemorablePassword())}
            className="panel px-2"
            title="Rigenera"
          >
            <RefreshCw className="h-3 w-3 text-primary" />
          </button>
        </div>
        <button
          onClick={submit}
          disabled={busy}
          className="btn-neon py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Crea agente
        </button>
      </div>

      {last && (
        <div className="panel p-3 bg-primary/10 border-primary/40 flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest text-primary">
            Credenziali (mostrate una sola volta)
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs">{last.username}</span>
            <button onClick={() => copy(last.username)} className="panel p-1.5">
              <Copy className="h-3 w-3 text-primary" />
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs break-all">{last.password}</span>
            <button onClick={() => copy(last.password)} className="panel p-1.5">
              <Copy className="h-3 w-3 text-primary" />
            </button>
          </div>
          <button
            onClick={() => copy(`Agente: ${last.username}\nPassword: ${last.password}`)}
            className="text-[10px] text-primary underline self-start"
          >
            Copia entrambi
          </button>
        </div>
      )}
    </div>
  );
}
