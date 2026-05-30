import { motion } from "framer-motion";
import { CORE_MISSIONS, FAMILY_COMMAND, GEO_BIOME_RULES, PIKMIN_SPECIALIZATIONS, SCANNER_TARGETS } from "@/data/secretPikminWorld";

export function SecretPikminVisionPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      <section className="panel-strong relative overflow-hidden p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(132,255,159,.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(80,180,255,.16),transparent_40%)]" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// progetto finale</p>
          <h2 className="font-display text-xl text-glow mt-1">{FAMILY_COMMAND.title}</h2>
          <p className="text-xs text-muted-foreground mt-2">{FAMILY_COMMAND.rule}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl border border-primary/20 bg-night/50 p-2">
              <p className="text-primary font-semibold">Comandante</p>
              <p className="text-muted-foreground">{FAMILY_COMMAND.commander}</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-night/50 p-2">
              <p className="text-primary font-semibold">Squadra</p>
              <p className="text-muted-foreground">{FAMILY_COMMAND.firstExplorer}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CORE_MISSIONS.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`panel relative overflow-hidden p-4 bg-gradient-to-br ${m.color}`}
            >
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-2xl border border-primary/30 bg-night/60 grid place-items-center text-xl">
                  {m.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[10px] uppercase tracking-widest text-primary/80">{m.progressLabel}</p>
                  </div>
                  <h3 className="font-display text-base text-glow leading-tight mt-1">{m.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{compact ? m.short : m.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}

export function PikminSpecializationGrid() {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// accademia pikmin</p>
        <h2 className="font-display text-xl text-glow">Specializzazioni affidate ai Pikmin</h2>
        <p className="text-xs text-muted-foreground mt-1">Ogni Pikmin cresce in base alle missioni svolte: raccolta, ricerca, scouting, spionaggio, trasporto o combattimento.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PIKMIN_SPECIALIZATIONS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.key} className="panel p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/25 grid place-items-center text-lg">{s.emoji}</div>
                <div>
                  <p className="font-display text-sm text-glow">{s.title}</p>
                  <p className="text-[10px] text-primary/80 flex items-center gap-1"><Icon className="h-3 w-3" /> tipi consigliati: {s.bestTypes.join(", ")}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {s.duties.map((d) => <span key={d} className="rounded-full bg-night/60 border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{d}</span>)}
              </div>
              <div className="flex flex-wrap gap-1">
                {s.bonuses.map((b) => <span key={b} className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] text-primary">+ {b}</span>)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function GeoBiomeAndScannerPanel() {
  return (
    <div className="space-y-4">
      <section className="panel-strong p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// radar + scanner camera</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCANNER_TARGETS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.type} className="rounded-xl border border-primary/20 bg-night/60 p-2">
                <div className="flex items-center gap-2 text-primary"><Icon className="h-3.5 w-3.5" /><span className="text-lg">{t.emoji}</span></div>
                <p className="font-display text-xs text-glow mt-1">{t.type}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// biomi geolocalizzati</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GEO_BIOME_RULES.map((b) => (
            <div key={b.key} className="panel p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-sm text-glow"><span className="mr-1">{b.emoji}</span>{b.label}</p>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] text-primary uppercase tracking-wider">{b.bonus}</span>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">Materiali: {b.materials.join(", ")}</p>
              <p className="text-[10px] text-muted-foreground">Pikmin frequenti: {b.pikmin.join(", ")} · Minacce: {b.threats.join(", ")}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
