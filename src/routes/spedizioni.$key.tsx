import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSession } from "@/lib/session";
import { PageShell } from "@/components/PageShell";
import { PikminCounter } from "@/components/PikminCounter";
import {
  fetchTemplates,
  fetchExpedition,
  createExpedition,
  joinExpedition,
  cancelExpedition,
  previewExpedition,
  effectiveDurationMinutes,
  resolveExpedition,
  BIOME_META,
  DIFFICULTY_META,
  RISK_META,
  PARTNER_OF,
  type MissionTemplate,
  type Expedition,
  type ExpeditionSquad,
} from "@/lib/expeditions";
import { getPikminCount } from "@/lib/pikmin";
import {
  ArrowLeft,
  Users,
  Clock,
  AlertTriangle,
  Rocket,
  Coins,
  Sparkles,
  Check,
  X,
  Zap,
} from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/spedizioni/$key")({
  component: SpedizioneDetail,
});

function SpedizioneDetail() {
  const { key } = Route.useParams();
  const isUuid = UUID_RE.test(key);
  return isUuid ? <ExpeditionView id={key} /> : <PrepareView templateKey={key} />;
}

// ============== PREPARAZIONE ==============
function PrepareView({ templateKey }: { templateKey: string }) {
  const navigate = useNavigate();
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role ?? "lorenzo";
  const [template, setTemplate] = useState<MissionTemplate | null>(null);
  const [available, setAvailable] = useState(0);
  const [squadBreakdown, setSquadBreakdown] = useState<Record<string, number>>({});
  const [allBreakdown, setAllBreakdown] = useState<Record<string, number>>({});
  const [isCoop, setIsCoop] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const all = await fetchTemplates();
      setTemplate(all.find((t) => t.key === templateKey) ?? null);
      const { data } = await supabase
        .from("pikmin_squad")
        .select("count, breakdown")
        .eq("id", "team")
        .maybeSingle();
      setAvailable((data?.count as number) ?? 0);
      setAllBreakdown(((data?.breakdown as Record<string, number>) ?? {}) as Record<string, number>);
    })();
  }, [templateKey]);

  const total = Object.values(squadBreakdown).reduce((a, b) => a + b, 0);

  const preview = useMemo(() => {
    if (!template) return null;
    return previewExpedition({
      template,
      totalPikmin: total,
      breakdown: squadBreakdown,
      coopBonus: isCoop,
    });
  }, [template, total, squadBreakdown, isCoop]);

  const duration = template ? effectiveDurationMinutes(template, total, isCoop) : 0;

  if (!template) return <div className="p-6 text-sm text-muted-foreground">Caricamento…</div>;

  const biome = BIOME_META[template.biome];
  const diff = DIFFICULTY_META[template.difficulty];

  const setType = (type: string, value: number) => {
    const max = allBreakdown[type] ?? 0;
    setSquadBreakdown((s) => ({ ...s, [type]: Math.max(0, Math.min(max, value)) }));
  };

  const allTypes = Object.keys(allBreakdown);

  const launch = async () => {
    if (!template) return;
    setError(null);
    setBusy(true);
    try {
      const exp = await createExpedition({
        template,
        agent,
        isCoop,
        totalPikmin: total,
        breakdown: squadBreakdown,
      });
      navigate({ to: "/spedizioni/$key", params: { key: exp.id } });
    } catch (e: any) {
      setError(e?.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Prepara squadra"
      subtitle={template.title}
      action={
        <div className="flex items-center gap-2">
          <PikminCounter compact />
          <Link to="/spedizioni" className="panel px-2.5 py-1.5 text-[10px] flex items-center gap-1 text-muted-foreground">
            <ArrowLeft className="h-3 w-3" /> Indietro
          </Link>
        </div>
      }
    >
      <div className={`panel-strong p-4 bg-gradient-to-br ${biome.color} relative overflow-hidden`}>
        <span className="hud-corner tl" />
        <span className="hud-corner br" />
        <div className="flex items-start gap-3">
          <div className="text-4xl">{biome.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${diff.color}`}>
                {diff.label}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {duration}m
              </span>
            </div>
            <h2 className="font-display text-lg">{template.title}</h2>
            {template.description && <p className="text-xs text-muted-foreground mt-1">{template.description}</p>}
            <p className="text-[10px] text-muted-foreground mt-2">
              Min {template.pikmin_min} · Consigliati {template.pikmin_recommended} · Max {template.pikmin_max}
            </p>
          </div>
        </div>
      </div>

      {/* COOP TOGGLE */}
      <button
        onClick={() => setIsCoop((v) => !v)}
        className={`w-full panel p-3 flex items-center justify-between ${
          isCoop ? "ring-1 ring-fuchsia-500/50 bg-fuchsia-500/10" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <Users className={`h-4 w-4 ${isCoop ? "text-fuchsia-300" : "text-muted-foreground"}`} />
          <div className="text-left">
            <p className="text-sm font-semibold">Missione cooperativa</p>
            <p className="text-[10px] text-muted-foreground">
              Invita {PARTNER_OF[agent] === "papa" ? "Papà" : "Lorenzo"} · +15% successo
            </p>
          </div>
        </div>
        <div className={`h-5 w-9 rounded-full ${isCoop ? "bg-fuchsia-500" : "bg-muted/40"} relative transition`}>
          <span
            className={`absolute top-0.5 ${isCoop ? "left-4" : "left-0.5"} h-4 w-4 rounded-full bg-white transition-all`}
          />
        </div>
      </button>

      {/* COMPOSIZIONE SQUADRA */}
      <div className="panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-widest text-primary">Composizione squadra</h3>
          <p className="text-[10px] text-muted-foreground">Pikmin disponibili: {available}</p>
        </div>
        {allTypes.length === 0 && (
          <p className="text-xs text-muted-foreground">Non hai Pikmin disponibili. Esplora la mappa per reclutarne!</p>
        )}
        {allTypes.map((type) => {
          const max = allBreakdown[type] ?? 0;
          const val = squadBreakdown[type] ?? 0;
          const isRec = template.recommended_types.includes(type);
          return (
            <div key={type}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs uppercase tracking-widest ${isRec ? "text-primary text-glow" : "text-muted-foreground"}`}>
                  {type} {isRec && <Sparkles className="inline h-3 w-3" />}
                </span>
                <span className="text-xs font-display tabular-nums">
                  {val}/{max}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={max}
                value={val}
                onChange={(e) => setType(type, Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          );
        })}
      </div>

      {/* PREVIEW */}
      {preview && total > 0 && (
        <div className="panel-strong p-4 space-y-3 relative overflow-hidden">
          <span className="hud-corner tl" />
          <span className="hud-corner br" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Potenza spedizione
            </p>
            <p className="font-display text-lg text-glow">{preview.power}</p>
          </div>
          <div className="h-2 w-full rounded-full bg-night/60 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-yellow-300 to-rose-400 transition-all"
              style={{ width: `${Math.min(100, preview.successChance * 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Cell label="Successo" value={`${Math.round(preview.successChance * 100)}%`} />
            <Cell label="Rischio" value={RISK_META[preview.risk].label} accent={RISK_META[preview.risk].color} />
            <Cell label="Velocità" value={preview.speed} />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Compatibilità bioma: {Math.round(preview.recommendedMatchPct * 100)}%
            {isCoop && " · Bonus coop attivo +15%"}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <button
        onClick={launch}
        disabled={busy || total < template.pikmin_min}
        className="btn-neon w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Rocket className="h-4 w-4" />
        {total < template.pikmin_min
          ? `Servono almeno ${template.pikmin_min} Pikmin`
          : isCoop
            ? `Lancia invito coop · ${total} Pikmin`
            : `Lancia spedizione · ${total} Pikmin`}
      </button>
    </PageShell>
  );
}

function Cell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-night/60 border border-primary/15 p-2">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-display text-sm ${accent ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}

// ============== VISTA SPEDIZIONE ATTIVA / CONCLUSA ==============
function ExpeditionView({ id }: { id: string }) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = session?.role ?? "lorenzo";
  const [data, setData] = useState<{ exp: Expedition; squads: ExpeditionSquad[] } | null>(null);
  const [template, setTemplate] = useState<MissionTemplate | null>(null);
  const [, setTick] = useState(0);

  const load = async () => {
    const d = await fetchExpedition(id);
    setData(d);
    if (d) {
      const { data: t } = await supabase
        .from("mission_templates")
        .select("*")
        .eq("key", d.exp.template_key)
        .maybeSingle();
      setTemplate(t as unknown as MissionTemplate);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`exp-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expeditions", filter: `id=eq.${id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expedition_squads", filter: `expedition_id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!data) return;
    if (
      data.exp.status === "active" &&
      data.exp.end_at &&
      new Date(data.exp.end_at).getTime() <= Date.now()
    ) {
      resolveExpedition(id).then(() => load());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.exp.status, data?.exp.end_at]);

  if (!data || !template) return <div className="p-6 text-sm text-muted-foreground">Caricamento…</div>;
  const { exp, squads } = data;
  const biome = BIOME_META[exp.biome];
  const diff = DIFFICULTY_META[exp.difficulty];
  const risk = RISK_META[exp.risk];
  const totalMs = exp.end_at && exp.started_at ? new Date(exp.end_at).getTime() - new Date(exp.started_at).getTime() : 1;
  const leftMs = exp.end_at ? new Date(exp.end_at).getTime() - Date.now() : 0;
  const pct = exp.status === "active" ? Math.max(0, Math.min(100, 100 - (leftMs / totalMs) * 100)) : 100;
  const mins = Math.max(0, Math.ceil(leftMs / 60000));
  const isInvited = exp.partner === agent && exp.status === "waiting_partner";

  return (
    <PageShell
      title={exp.title}
      subtitle={`${biome?.label} · ${diff.label}${exp.is_coop ? " · COOP" : ""}`}
      action={
        <Link to="/spedizioni" className="panel px-2.5 py-1.5 text-[10px] flex items-center gap-1 text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Indietro
        </Link>
      }
    >
      <div className={`panel-strong p-4 bg-gradient-to-br ${biome?.color ?? ""} relative overflow-hidden`}>
        <span className="hud-corner tl" />
        <span className="hud-corner br" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl">{biome?.emoji}</span>
          <span className={`flex items-center gap-1 text-xs ${risk.color}`}>
            <AlertTriangle className="h-3 w-3" /> Rischio {risk.label}
          </span>
        </div>
        {exp.status === "active" && (
          <>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Rientro fra {mins}m
            </p>
            <div className="h-2 w-full rounded-full bg-night/60 overflow-hidden">
              <div className="h-full bg-primary glow-soft transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        )}
        {exp.status === "waiting_partner" && (
          <p className="text-sm text-amber-200">
            ⏳ In attesa che {PARTNER_OF[exp.created_by] === "papa" ? "Papà" : "Lorenzo"} confermi la sua squadra…
          </p>
        )}
        {(exp.status === "completed" || exp.status === "failed") && (
          <p className="text-sm">
            {exp.result === "successo" && <span className="text-emerald-300">✓ Successo!</span>}
            {exp.result === "parziale" && <span className="text-yellow-300">~ Risultato parziale</span>}
            {exp.result === "fallito" && <span className="text-rose-300">✗ Spedizione fallita</span>}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <Cell label="Potenza" value={String(exp.power)} />
          <Cell label="Successo" value={`${Math.round(exp.success_chance * 100)}%`} />
          <Cell label="Durata" value={`${exp.duration_minutes}m`} />
        </div>
      </div>

      {/* SQUADRE */}
      <div className="panel p-4 space-y-3">
        <h3 className="font-display text-sm uppercase tracking-widest text-primary flex items-center gap-1">
          <Users className="h-3 w-3" /> Squadre
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(exp.is_coop ? ["papa", "lorenzo"] : [exp.created_by]).map((a) => {
            const s = squads.find((x) => x.agent === a);
            return (
              <div key={a} className="rounded-lg bg-night/60 border border-primary/15 p-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {a === "papa" ? "👨 Papà" : "🧒 Lorenzo"}
                </p>
                {s ? (
                  <>
                    <p className="font-display text-lg text-glow">{s.pikmin_total} Pikmin</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(s.breakdown ?? {}).map(([k, v]) =>
                        Number(v) > 0 ? (
                          <span key={k} className="text-[10px] panel px-1.5 py-0.5">
                            {k}×{v}
                          </span>
                        ) : null,
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">In attesa…</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AZIONI INVITATO */}
      {isInvited && <JoinPanel exp={exp} template={template} agent={agent} onJoined={load} />}

      {/* AZIONI CREATORE */}
      {exp.created_by === agent && exp.status === "waiting_partner" && (
        <button
          onClick={async () => {
            await cancelExpedition(exp.id);
          }}
          className="w-full rounded-lg border border-destructive/40 px-3 py-2 text-xs text-destructive flex items-center justify-center gap-1"
        >
          <X className="h-3 w-3" /> Annulla invito e recupera Pikmin
        </button>
      )}

      {/* DIARIO EVENTI */}
      {exp.events && exp.events.length > 0 && (
        <div className="panel p-4 space-y-2">
          <h3 className="font-display text-sm uppercase tracking-widest text-primary">Diario spedizione</h3>
          {exp.events.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 text-sm"
            >
              <span className="text-xl">{ev.emoji}</span>
              <span>{ev.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* RICOMPENSE */}
      {(exp.status === "completed" || exp.status === "failed") && exp.rewards && (
        <div className="panel-strong p-4 space-y-2">
          <h3 className="font-display text-sm uppercase tracking-widest text-primary flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Ricompense
          </h3>
          {(exp.rewards as any).coins > 0 && (
            <p className="text-sm flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-300" /> +{(exp.rewards as any).coins} monete
            </p>
          )}
          {(exp.rewards as any).xp > 0 && (
            <p className="text-sm">⭐ +{(exp.rewards as any).xp} XP</p>
          )}
          {(exp.rewards as any).ingredients?.length > 0 && (
            <p className="text-sm">🧪 Ingredienti: {((exp.rewards as any).ingredients as string[]).join(", ")}</p>
          )}
          {(exp.rewards as any).ship_part && (
            <p className="text-sm flex items-center gap-1 text-amber-200">
              <Rocket className="h-4 w-4" /> Pezzo navicella: {(exp.rewards as any).ship_part}
            </p>
          )}
          {exp.summary && <p className="text-xs text-muted-foreground mt-2">{exp.summary}</p>}
        </div>
      )}
    </PageShell>
  );
}

function JoinPanel({
  exp,
  template,
  agent,
  onJoined,
}: {
  exp: Expedition;
  template: MissionTemplate;
  agent: string;
  onJoined: () => void;
}) {
  const [breakdown, setBreakdown] = useState<Record<string, number>>({});
  const [available, setAvailable] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pikmin_squad")
        .select("breakdown")
        .eq("id", "team")
        .maybeSingle();
      setAvailable(((data?.breakdown as Record<string, number>) ?? {}) as Record<string, number>);
      setTotal(await getPikminCount());
    })();
  }, []);

  const sum = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const join = async () => {
    setError(null);
    setBusy(true);
    try {
      await joinExpedition({ expeditionId: exp.id, agent, totalPikmin: sum, breakdown });
      onJoined();
    } catch (e: any) {
      setError(e?.message ?? "Errore");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel-strong p-4 space-y-3 border border-amber-400/40">
      <p className="text-[10px] uppercase tracking-widest text-amber-300 flex items-center gap-1">
        <Sparkles className="h-3 w-3" /> Invito ricevuto · aggiungi la tua squadra
      </p>
      {Object.keys(available).map((type) => {
        const max = available[type] ?? 0;
        const val = breakdown[type] ?? 0;
        const isRec = template.recommended_types.includes(type);
        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs uppercase tracking-widest ${isRec ? "text-primary text-glow" : "text-muted-foreground"}`}>
                {type} {isRec && "✦"}
              </span>
              <span className="text-xs font-display tabular-nums">
                {val}/{max}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={max}
              value={val}
              onChange={(e) => {
                const v = Math.max(0, Math.min(max, Number(e.target.value)));
                setBreakdown((s) => ({ ...s, [type]: v }));
              }}
              className="w-full accent-primary"
            />
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground">
        Disponibili totali: {total} · La spedizione partirà appena confermi.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <button
        onClick={join}
        disabled={busy || sum < 1}
        className="btn-neon w-full py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Check className="h-4 w-4" /> Conferma e parti · {sum} Pikmin
      </button>
    </div>
  );
}
