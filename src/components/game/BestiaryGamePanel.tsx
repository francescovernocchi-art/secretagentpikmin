import { useEffect, useState } from "react";
import { fetchBestiaryEntries, studyStatusEmoji } from "@/lib/game/bestiary";
import { rarityColor } from "@/data/artDirection";
import { CreaturePortraitSvg, BiomeIconSvg } from "@/components/game/assets/GameIcons";
import { ParticleEffect } from "@/components/fx/ParticleEffect";
import type { DbBestiaryEntry } from "@/types/phase2-db";
import type { BiomeKey } from "@/types/secretPikmin";

interface BestiaryGamePanelProps {
  compact?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  avvistato: "Avvistato",
  studiato: "In studio",
  classificato: "Classificato",
};

export function BestiaryGamePanel({ compact = false }: BestiaryGamePanelProps) {
  const [entries, setEntries] = useState<DbBestiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBestiaryEntries().then(({ data }) => {
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const classified = entries.filter((e) => e.study_status === "classificato").length;

  return (
    <section className="space-y-3 relative">
      {!compact && <ParticleEffect variant="energy" density="low" className="opacity-40 rounded-2xl" />}

      {!compact && (
        <header className="relative">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[var(--ad-danger)]/90">// Bestiario attivo</p>
          <h2 className="font-display text-xl text-glow">Creature incontrate</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {entries.length} schede · {classified} classificate · debolezze dopo studio approfondito
          </p>
        </header>
      )}

      {loading && <p className="text-xs text-muted-foreground animate-pulse">Carico bestiario…</p>}

      <div className={`grid gap-3 relative ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {entries.map((e) => (
          <CreatureCard key={e.id} entry={e} compact={compact} />
        ))}
        {!loading && entries.length === 0 && (
          <p className="text-xs text-muted-foreground col-span-2 py-8 text-center panel">
            Nessuna creatura registrata — usa lo scanner o le spedizioni
          </p>
        )}
      </div>
    </section>
  );
}

function CreatureCard({ entry: e, compact }: { entry: DbBestiaryEntry; compact?: boolean }) {
  const rarity = rarityColor(e.danger_level ?? 1);
  const status = e.study_status ?? "avvistato";

  return (
    <article
      className="creature-card p-3"
      style={{ ["--card-rarity" as string]: rarity }}
    >
      <div className="flex gap-3">
        <CreaturePortraitSvg emoji={e.emoji ?? undefined} dangerLevel={e.danger_level ?? 1} size={compact ? 52 : 64} />

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-sm text-glow leading-tight">{e.name}</h3>
            <span
              className="shrink-0 text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
              style={{ borderColor: `${rarity}66`, color: rarity, background: `${rarity}18` }}
            >
              {studyStatusEmoji(status)} {STATUS_LABELS[status] ?? status}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <BiomeIconSvg biome={(e.biome_key as BiomeKey) ?? "bosco"} size={18} />
            <span>{e.biome_key ?? "bioma ?"}</span>
            <span className="text-[var(--ad-danger)]">●</span>
            <span>Pericolo {e.danger_level}/5</span>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Dati raccolti: {e.data_points ?? e.scan_count ?? 0} · Classificazione {Math.round(((e.data_points ?? 0) / 10) * 100)}%
          </p>

          <div className="progress-mission mt-1 max-w-[140px]">
            <div
              className="progress-mission-fill"
              style={{ width: `${Math.min(100, ((e.data_points ?? 0) / 10) * 100)}%`, background: `linear-gradient(90deg, ${rarity}, var(--ad-mission))` }}
            />
          </div>

          {e.weakness_unlocked && e.weakness ? (
            <p className="text-[10px] text-emerald-400 mt-1 panel px-2 py-1 inline-block">
              Debolezza: <span className="font-medium">{e.weakness}</span>
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground/80 mt-1 italic">
              Debolezza: ████ (continua a studiare)
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
