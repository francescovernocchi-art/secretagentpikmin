import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { PikminCounter } from "@/components/PikminCounter";
import {
  fetchTemplates,
  fetchExpeditions,
  resolveExpedition,
  BIOME_META,
  DIFFICULTY_META,
  RISK_META,
  PARTNER_OF,
  type MissionTemplate,
  type Expedition,
} from "@/lib/expeditions";
import { ExpeditionLaunchPanel } from "@/components/game/ExpeditionLaunchPanel";
import { Rocket, Clock, Users, AlertTriangle, ChevronRight, Sparkles, Bell } from "lucide-react";

export const Route = createFileRoute("/spedizioni")({
  component: SpedizioniPage,
});

type Tab = "disponibili" | "in_corso" | "storico";

function SpedizioniPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role ?? "lorenzo";
  const [tab, setTab] = useState<Tab>("disponibili");
  const [templates, setTemplates] = useState<MissionTemplate[]>([]);
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [, setTick] = useState(0);

  const load = async () => {
    const [t, e] = await Promise.all([fetchTemplates(), fetchExpeditions()]);
    setTemplates(t);
    setExpeditions(e);
    // tenta la risoluzione delle spedizioni scadute
    for (const exp of e) {
      if (exp.status === "active" && exp.end_at && new Date(exp.end_at).getTime() <= Date.now()) {
        try {
          await resolveExpedition(exp.id);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("expeditions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "expeditions" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "expedition_squads" }, () => load())
      .subscribe();
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ogni 15s prova a risolvere quelle scadute
  useEffect(() => {
    const i = setInterval(() => {
      for (const exp of expeditions) {
        if (
          (exp.status === "active" || exp.status === "waiting_partner") &&
          exp.end_at &&
          new Date(exp.end_at).getTime() <= Date.now()
        ) {
          resolveExpedition(exp.id).catch(() => {});
        }
      }
    }, 15_000);
    return () => clearInterval(i);
  }, [expeditions]);

  const active = expeditions.filter(
    (e) => e.status === "active" || e.status === "waiting_partner" || e.status === "preparing",
  );
  const history = expeditions.filter(
    (e) => e.status === "completed" || e.status === "failed" || e.status === "cancelled",
  );

  const notifications = useNotifications(agent);

  return (
    <PageShell
      title="Spedizioni"
      subtitle="Inviare squadre · cooperare con il partner"
      action={
        <div className="flex items-center gap-2">
          <PikminCounter compact />
          {notifications.length > 0 && (
            <span className="relative">
              <Bell className="h-4 w-4 text-amber-300" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 text-[8px] font-bold text-night flex items-center justify-center">
                {notifications.length}
              </span>
            </span>
          )}
        </div>
      }
    >
      {/* TABS */}
      <div className="flex gap-2">
        {([
          ["disponibili", "Disponibili"],
          ["in_corso", `In corso (${active.length})`],
          ["storico", "Storico"],
        ] as const).map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setTab(k as Tab)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              tab === k ? "bg-primary text-primary-foreground" : "panel text-muted-foreground"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {tab === "disponibili" && (
        <>
          <ExpeditionLaunchPanel />
          <AvailableList templates={templates} />
        </>
      )}
      {tab === "in_corso" && <ActiveList expeditions={active} agent={agent} />}
      {tab === "storico" && <HistoryList expeditions={history} />}
    </PageShell>
  );
}

function useNotifications(agent: string) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("mission_notifications")
        .select("*")
        .eq("agent", agent)
        .is("read_at", null)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
    };
    load();
    const ch = supabase
      .channel(`notif-${agent}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mission_notifications", filter: `agent=eq.${agent}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [agent]);
  return items;
}

function AvailableList({ templates }: { templates: MissionTemplate[] }) {
  const byBiome = useMemo(() => {
    const m = new Map<string, MissionTemplate[]>();
    for (const t of templates) {
      if (!m.has(t.biome)) m.set(t.biome, []);
      m.get(t.biome)!.push(t);
    }
    return Array.from(m.entries());
  }, [templates]);

  if (templates.length === 0) {
    return <p className="text-center text-xs text-muted-foreground py-10">Caricamento missioni…</p>;
  }

  return (
    <div className="space-y-5">
      {byBiome.map(([biome, list]) => {
        const meta = BIOME_META[biome as keyof typeof BIOME_META];
        return (
          <section key={biome} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="text-xl">{meta?.emoji}</span>
              <h3 className="font-display text-base text-glow">{meta?.label ?? biome}</h3>
            </div>
            <div className="space-y-2">
              {list.map((t) => (
                <TemplateCard key={t.key} template={t} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TemplateCard({ template }: { template: MissionTemplate }) {
  const biome = BIOME_META[template.biome];
  const diff = DIFFICULTY_META[template.difficulty];
  return (
    <Link
      to="/spedizioni/$key"
      params={{ key: template.key }}
      className={`block relative panel p-4 overflow-hidden bg-gradient-to-br ${biome.color} active:scale-[0.99] transition-transform`}
    >
      <span className="hud-corner tl" />
      <span className="hud-corner br" />
      <div className="flex items-start gap-3">
        <div className="text-3xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">{biome.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${diff.color}`}>
              {diff.label}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {template.duration_minutes}m
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {template.pikmin_min}–{template.pikmin_max}
            </span>
          </div>
          <h4 className="font-display text-base text-foreground leading-tight">{template.title}</h4>
          {template.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {template.recommended_types.map((t) => (
              <span key={t} className="text-[9px] uppercase tracking-widest panel px-1.5 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-primary/60 self-center" />
      </div>
    </Link>
  );
}

function ActiveList({ expeditions, agent }: { expeditions: Expedition[]; agent: string }) {
  if (expeditions.length === 0)
    return <p className="text-center text-xs text-muted-foreground py-10">Nessuna spedizione attiva.</p>;
  return (
    <div className="space-y-2">
      <AnimatePresence>
        {expeditions.map((e) => (
          <motion.div key={e.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <ActiveCard exp={e} agent={agent} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ActiveCard({ exp, agent }: { exp: Expedition; agent: string }) {
  const biome = BIOME_META[exp.biome];
  const diff = DIFFICULTY_META[exp.difficulty];
  const risk = RISK_META[exp.risk];
  const totalMs = exp.end_at && exp.started_at ? new Date(exp.end_at).getTime() - new Date(exp.started_at).getTime() : 1;
  const leftMs = exp.end_at ? new Date(exp.end_at).getTime() - Date.now() : 0;
  const pct = exp.status === "active" ? Math.max(0, Math.min(100, 100 - (leftMs / totalMs) * 100)) : 0;
  const mins = Math.max(0, Math.ceil(leftMs / 60000));
  const isMine = exp.created_by === agent;
  const isInvited = exp.partner === agent && exp.status === "waiting_partner";

  return (
    <Link
      to="/spedizioni/$key"
      params={{ key: exp.id }}
      className={`block panel p-4 bg-gradient-to-br ${biome?.color ?? ""} relative overflow-hidden`}
    >
      <span className="hud-corner tl" />
      <span className="hud-corner br" />
      <div className="flex items-start gap-3">
        <div className="text-2xl">{biome?.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${diff.color}`}>
              {diff.label}
            </span>
            {exp.is_coop && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40 flex items-center gap-1">
                <Users className="h-3 w-3" /> COOP
              </span>
            )}
            {isInvited && (
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/60 animate-pulse">
                Invito!
              </span>
            )}
          </div>
          <h4 className="font-display text-base">{exp.title}</h4>
          <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {exp.status === "active" ? `${mins}m al rientro` : "in attesa partner"}
            </span>
            <span className={`flex items-center gap-1 ${risk.color}`}>
              <AlertTriangle className="h-3 w-3" /> {risk.label}
            </span>
          </div>
          {exp.status === "active" && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-night/60 overflow-hidden">
              <div className="h-full bg-primary glow-soft transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-primary/60 self-center" />
      </div>
      {isInvited && (
        <div className="mt-3 text-[11px] text-amber-200 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> {exp.created_by === "papa" ? "Papà" : "Lorenzo"} ti ha invitato a partecipare!
        </div>
      )}
      {!isMine && !isInvited && exp.is_coop && (
        <div className="mt-2 text-[10px] text-muted-foreground">
          Spedizione coop di {PARTNER_OF[agent]} · supporto attivo
        </div>
      )}
    </Link>
  );
}

function HistoryList({ expeditions }: { expeditions: Expedition[] }) {
  if (expeditions.length === 0)
    return <p className="text-center text-xs text-muted-foreground py-10">Nessuna spedizione conclusa.</p>;
  return (
    <div className="space-y-2">
      {expeditions.map((e) => (
        <Link
          key={e.id}
          to="/spedizioni/$key"
          params={{ key: e.id }}
          className="block panel p-3 flex items-center gap-3"
        >
          <span className="text-2xl">{BIOME_META[e.biome]?.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{e.title}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {e.result === "successo"
                ? "✓ Successo"
                : e.result === "parziale"
                  ? "~ Parziale"
                  : e.result === "fallito"
                    ? "✗ Fallita"
                    : e.status}
            </p>
          </div>
          <Rocket className="h-4 w-4 text-primary/60" />
        </Link>
      ))}
    </div>
  );
}
