import { useState } from "react";
import { toast } from "sonner";
import { Coins, ShoppingBag, Globe, Loader2, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMarket, useMissionProgress } from "@/hooks/useGameData";
import { ResourceTransformPanel } from "@/components/game/ResourceTransformPanel";
import { FamilyTradePanel } from "@/components/game/FamilyTradePanel";
import { hapticTap } from "@/lib/haptic";
import { triggerGameFx } from "@/lib/game-event-fx";
import { itemRarityFromPrice } from "@/data/artDirection";
import { MarketGameCard } from "@/components/game/market/MarketGameCard";

interface MarketPanelProps {
  compact?: boolean;
}

export function MarketPanel({ compact = false }: MarketPanelProps) {
  const { items, transactions, loading, selling, sell, reload } = useMarket();
  const { progress, reload: reloadProgress } = useMissionProgress();
  const [busy, setBusy] = useState(false);
  const [debtFlash, setDebtFlash] = useState(false);
  const [lastSale, setLastSale] = useState<number | null>(null);

  const debtRemaining = progress ? progress.debtTotal - progress.debtPaid : 0;
  const debtPct = progress?.debtTotal
    ? Math.round((progress.debtPaid / progress.debtTotal) * 100)
    : 0;

  const handleSell = async (itemKey: string) => {
    hapticTap();
    setBusy(true);
    try {
      const result = await sell(itemKey, 1);
      if (result.success) {
        triggerGameFx("market_sell");
        setLastSale(result.credits);
        setDebtFlash(true);
        window.setTimeout(() => setDebtFlash(false), 1200);
        toast.success(result.message);
        await reloadProgress();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!compact && (
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Market</p>
          <h2 className="font-display text-xl text-glow">Mercato Galattico + Scambio Famiglia</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Vendi dal tuo inventario: i crediti riducono il debito planetario.
          </p>
        </header>
      )}

      <section className={`panel-strong p-4 flex items-center justify-between gap-3 transition ${debtFlash ? "market-debt-flash" : ""}`}>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
            <Coins className="h-3 w-3" /> Debito planetario
          </p>
          <p className="font-display text-2xl text-glow">{loading ? "…" : `${debtRemaining} cr`}</p>
          {progress && (
            <>
              <p className="text-[10px] text-muted-foreground">
                Versati {progress.debtPaid} / {progress.debtTotal}
              </p>
              <div className="progress-mission mt-2 max-w-[180px]">
                <div className="progress-mission-fill" style={{ width: `${debtPct}%` }} />
              </div>
            </>
          )}
          <AnimatePresence>
            {lastSale != null && debtFlash && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1"
              >
                <TrendingDown className="h-3 w-3" /> −{lastSale} cr al debito
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="h-16 w-16 rounded-2xl border border-primary/30 bg-primary/10 grid place-items-center">
          <Globe className="h-8 w-8 text-primary" />
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
          <ShoppingBag className="h-3 w-3" /> Il tuo inventario — vendi
        </p>
        {loading && <p className="text-xs text-muted-foreground">Carico inventario…</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((m) => {
            const rarity = itemRarityFromPrice(m.sell_price);
            const kind = m.category === "ingrediente" ? "berry" : m.category === "materiale" ? "crystal" : "berry";
            return (
              <MarketGameCard
                key={m.id}
                emoji={m.emoji}
                name={m.item_name}
                rarity={rarity}
                subtitle={`${m.sellerLabel} · x${m.quantity} · ${m.category}`}
                iconKind={kind}
                footer={
                  <div className="flex items-center justify-between">
                    <p className="text-primary font-display text-lg">{m.sell_price} cr</p>
                    <button
                      onClick={() => handleSell(m.item_key)}
                      disabled={busy || selling === m.item_key || m.quantity < 1}
                      className="btn-neon px-3 py-1 text-[10px] flex items-center gap-1 disabled:opacity-50"
                    >
                      {(selling === m.item_key || busy) && <Loader2 className="h-3 w-3 animate-spin" />}
                      Vendi
                    </button>
                  </div>
                }
              />
            );
          })}
          {!loading && items.length === 0 && (
            <p className="text-xs text-muted-foreground col-span-2 py-4 text-center">
              Inventario vuoto — usa lo scanner per trovare oggetti
            </p>
          )}
        </div>
      </section>

      {transactions.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary/80">Ultime vendite</p>
          <ul className="space-y-1">
            {transactions.slice(0, 5).map((t) => (
              <li key={t.id} className="text-[10px] text-muted-foreground">
                {t.item_name} · +{t.price} cr · {new Date(t.created_at).toLocaleDateString("it-IT")}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ResourceTransformPanel compact={compact} />

      <FamilyTradePanel compact={compact} />

      <button onClick={() => reload()} className="text-[10px] text-primary uppercase tracking-widest">
        Aggiorna market →
      </button>
    </div>
  );
}
