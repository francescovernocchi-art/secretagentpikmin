import { motion } from "framer-motion";
import { PIKMIN_SPECIALIZATIONS, PIKMIN_TYPES, getPikminType } from "@/data/secretPikminWorld";
import type { PikminSpecializationKey } from "@/types/secretPikmin";
import { usePikminSquad } from "@/hooks/useGameData";
import { hapticTap } from "@/lib/haptic";

interface PikminSpecializationPanelProps {
  showTypes?: boolean;
  ownerAgent?: string;
}

export function PikminSpecializationPanel({ showTypes = true, ownerAgent }: PikminSpecializationPanelProps) {
  const { squad, loading, source, assignSpecialization } = usePikminSquad(ownerAgent);

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Squadra Pikmin</p>
        <h2 className="font-display text-xl text-glow">Specializzazioni e mansioni</h2>
        <p className="text-xs text-muted-foreground mt-1">
          I Comandanti non hanno classi. Assegna una specializzazione a ogni Pikmin — salvata su{" "}
          {source === "supabase" ? "Supabase" : "storage locale"}.
        </p>
      </header>

      {loading && <p className="text-xs text-muted-foreground animate-pulse">Carico squadra…</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {squad.map((p, i) => {
          const typeDef = getPikminType(p.type);
          const spec = PIKMIN_SPECIALIZATIONS.find((s) => s.key === p.specialization);
          const xpPct = Math.round((p.experience / p.experienceToNext) * 100);
          return (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="panel p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-2xl border border-primary/30 grid place-items-center text-2xl"
                  style={{ background: `radial-gradient(circle, ${typeDef?.color ?? "#888"}33, transparent)` }}
                >
                  {typeDef?.emoji ?? "🌱"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-base text-glow">{p.name}</h3>
                    <span className="text-[10px] text-primary">Lv {p.level}</span>
                    {p.specBadge && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
                        {p.specBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {typeDef?.label} · {spec?.title ?? p.specialization}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize">{p.status.replace("_", " ")}</p>
                </div>
              </div>

              <div className="h-1.5 rounded-full bg-night/80 overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${xpPct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">{p.experience}/{p.experienceToNext} XP</p>

              <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
                {(["forza", "velocita", "resistenza", "intelligenza"] as const).map((k) => (
                  <div key={k} className="rounded-lg bg-night/50 py-1">
                    <p className="text-muted-foreground uppercase">{k.slice(0, 3)}</p>
                    <p className="text-primary font-semibold">{p.stats[k]}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[9px] uppercase tracking-widest text-primary/70 mb-1">Specializzazione</p>
                <select
                  value={p.specialization}
                  onChange={(e) => {
                    hapticTap();
                    void assignSpecialization(p.id, e.target.value as PikminSpecializationKey);
                  }}
                  className="w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs outline-none focus:border-primary"
                >
                  {PIKMIN_SPECIALIZATIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.emoji} {s.title}
                    </option>
                  ))}
                </select>
              </div>
            </motion.article>
          );
        })}
      </div>

      {showTypes && (
        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary/80">Tipi e predisposizioni</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {PIKMIN_TYPES.map((t) => (
              <div key={t.key} className="panel p-2 text-center">
                <span className="text-xl">{t.emoji}</span>
                <p className="text-[10px] font-display text-glow mt-1">{t.label}</p>
                <p className="text-[8px] text-muted-foreground line-clamp-2 mt-0.5">{t.notes}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
