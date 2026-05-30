import { Link } from "@tanstack/react-router";
import { ScanLine, Sparkles } from "lucide-react";
import { Radar } from "@/components/Radar";
import { SCANNER_TARGETS, BIOMES, getBiomeByKey } from "@/data/secretPikminWorld";
import { hapticTap } from "@/lib/haptic";
import { useScannerBiome } from "@/hooks/useGameData";
import { formatRelativeTime } from "@/lib/game/home";

interface RadarScannerPanelProps {
  onScan?: () => void;
  scanning?: boolean;
  compact?: boolean;
  /** Se true, esegue scan bioma-aware internamente */
  biomeScan?: boolean;
  onScanComplete?: (result: { label: string; emoji: string; effects: string[] }) => void;
}

export function RadarScannerPanel({
  onScan,
  scanning = false,
  compact = false,
  biomeScan = false,
  onScanComplete,
}: RadarScannerPanelProps) {
  const { biome, recentScans, processing, runAreaScan } = useScannerBiome();
  const biomeDef = getBiomeByKey(biome);
  const busy = scanning || processing;

  const handleScan = async () => {
    if (biomeScan) {
      const result = await runAreaScan();
      onScanComplete?.({
        label: result.discovery.label,
        emoji: result.discovery.emoji,
        effects: result.effects,
      });
      return;
    }
    onScan?.();
  };

  return (
    <div className="space-y-4">
      <section className="panel-strong relative overflow-hidden p-5 flex flex-col items-center gap-3">
        <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80">// Radar + Scanner Area</p>
        {biomeDef && (
          <p className="text-xs text-primary">
            Bioma attivo: {biomeDef.emoji} {biomeDef.label}
          </p>
        )}
        <Radar size={compact ? 160 : 200} />
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Il radar rileva tracce nel bioma corrente. Lo scanner genera ritrovamenti coerenti e li salva.
        </p>
        <button onClick={handleScan} disabled={busy} className="btn-neon px-5 py-2.5 text-xs flex items-center gap-2">
          <ScanLine className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
          {busy ? "Scansione…" : "Scansiona Area"}
        </button>
        {!biomeScan && !onScan && (
          <Link to="/radar" onClick={hapticTap} className="text-[10px] text-primary uppercase tracking-widest">
            Apri scanner fotocamera →
          </Link>
        )}
      </section>

      {recentScans.length > 0 && (
        <section className="panel p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Scan recenti
          </p>
          <ul className="space-y-1">
            {recentScans.map((s) => (
              <li key={s.id} className="text-xs flex items-center gap-2">
                <span>{s.emoji ?? "✨"}</span>
                <span className="flex-1 truncate">{s.label}</span>
                <span className="text-muted-foreground">{formatRelativeTime(s.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel-strong p-4 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-primary/80">Target rilevabili</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCANNER_TARGETS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.type} className="rounded-xl border border-primary/20 bg-night/60 p-2">
                <div className="flex items-center gap-1 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-lg">{t.emoji}</span>
                </div>
                <p className="font-display text-xs text-glow mt-1">{t.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {!compact && (
        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary/80">Biomi collegati</p>
          <div className="flex flex-wrap gap-1">
            {BIOMES.map((b) => (
              <span
                key={b.key}
                className={`rounded-full px-2 py-0.5 text-[10px] border ${
                  b.key === biome ? "border-primary bg-primary/10 text-primary" : "bg-night/60 border-border"
                }`}
              >
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
