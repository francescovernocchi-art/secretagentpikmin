import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Handshake, Loader2, Plus, X, Check, Bell, History } from "lucide-react";
import { motion } from "framer-motion";
import { useMarket } from "@/hooks/useGameData";
import {
  createFamilyTradeOffer,
  acceptFamilyTrade,
  rejectFamilyTrade,
  fetchFamilyTrades,
  getPartnerAgent,
} from "@/lib/game/family-trades";
import { agentKeyFromSession, displayAgentName } from "@/lib/game/planet";
import { getSession } from "@/lib/session";
import { hapticTap } from "@/lib/haptic";
import { triggerGameFx } from "@/lib/game-event-fx";
import { DEMO_AGENTS } from "@/lib/demo-mode";
import { itemRarityFromPrice } from "@/data/artDirection";
import { MarketGameCard } from "@/components/game/market/MarketGameCard";
import type { DbFamilyTradeHistory, FamilyTradeOfferFull } from "@/types/phase4-db";

export function FamilyTradePanel({ compact = false }: { compact?: boolean }) {
  const session = typeof window !== "undefined" ? getSession() : null;
  const agent = agentKeyFromSession(session?.role);
  const partner = getPartnerAgent(agent);
  const me = agent === "papa" ? DEMO_AGENTS.papa : DEMO_AGENTS.lorenzo;
  const them = agent === "papa" ? DEMO_AGENTS.lorenzo : DEMO_AGENTS.papa;
  const { items, reload } = useMarket();
  const [incoming, setIncoming] = useState<FamilyTradeOfferFull[]>([]);
  const [outgoing, setOutgoing] = useState<FamilyTradeOfferFull[]>([]);
  const [history, setHistory] = useState<DbFamilyTradeHistory[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedKey, setSelectedKey] = useState("");
  const [qty, setQty] = useState(1);
  const [requestKey, setRequestKey] = useState("");
  const [message, setMessage] = useState("");

  const load = () => fetchFamilyTrades(agent).then((r) => {
    setIncoming(r.incoming);
    setOutgoing(r.outgoing);
    setHistory(r.history);
  });

  useEffect(() => { load(); }, [agent]);

  const sendTrade = async () => {
    if (!selectedKey) { toast.error("Seleziona un oggetto"); return; }
    const item = items.find((i) => i.item_key === selectedKey);
    if (!item || item.quantity < qty) { toast.error("Quantità insufficiente"); return; }
    setBusy(true);
    try {
      const requestItem = requestKey ? items.find((i) => i.item_key === requestKey) : null;
      const result = await createFamilyTradeOffer({
        fromAgent: agent,
        toAgent: partner,
        message,
        offerItems: [{ item_key: item.item_key, item_name: item.item_name, emoji: item.emoji, category: item.category, quantity: qty, sell_price: item.sell_price }],
        requestItems: requestItem ? [{ item_key: requestItem.item_key, item_name: requestItem.item_name, emoji: requestItem.emoji, category: requestItem.category, quantity: 1, sell_price: requestItem.sell_price }] : [],
      });
      if (result.success) {
        triggerGameFx("pickup");
        toast.success(result.message);
        setSelectedKey("");
        setQty(1);
        setMessage("");
        await Promise.all([load(), reload()]);
      } else toast.error(result.message);
    } finally { setBusy(false); }
  };

  const handleAccept = async (id: string) => {
    hapticTap();
    setBusy(true);
    try {
      const r = await acceptFamilyTrade(id, agent);
      if (r.success) {
        triggerGameFx("market_sell");
        toast.success(r.message);
      } else toast.error(r.message);
      await Promise.all([load(), reload()]);
    } finally { setBusy(false); }
  };

  const handleReject = async (id: string) => {
    hapticTap();
    const r = await rejectFamilyTrade(id, agent);
    r.success ? toast.info(r.message) : toast.error(r.message);
    await load();
  };

  const sellable = items.filter((i) => i.quantity > 0);

  return (
    <section className="space-y-3">
      {!compact && (
        <header>
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary/80">// Scambio Famiglia</p>
          <h2 className="font-display text-xl text-glow">P2P con {displayAgentName(partner)}</h2>
        </header>
      )}

      <div className="market-card p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{me.emoji}</span>
          <div>
            <p className="text-xs font-medium">{me.name}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Tu</p>
          </div>
        </div>
        <Handshake className="h-5 w-5 text-primary" />
        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-xs font-medium">{them.name}</p>
            <p className="text-[9px] text-muted-foreground uppercase">Partner</p>
          </div>
          <span className="text-2xl">{them.emoji}</span>
        </div>
      </div>

      {incoming.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-amber-300 uppercase tracking-wider">
          <Bell className="h-3 w-3" /> {incoming.length} proposta/e in attesa
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-primary/80 flex items-center gap-1">
          <Plus className="h-3 w-3" /> Nuova proposta
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar">
          {sellable.map((i) => {
            const rarity = itemRarityFromPrice(i.sell_price);
            const selected = selectedKey === i.item_key;
            return (
              <button
                key={i.item_key}
                type="button"
                onClick={() => setSelectedKey(i.item_key)}
                className={`text-left ${selected ? "ring-2 ring-primary rounded-xl" : ""}`}
              >
                <MarketGameCard
                  emoji={i.emoji}
                  name={i.item_name}
                  rarity={rarity}
                  subtitle={`x${i.quantity} · ${i.category}`}
                  iconKind={i.category === "materiale" ? "crystal" : "berry"}
                  value={<span className="text-primary font-display text-sm">{i.sell_price} cr</span>}
                />
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-16 rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs"
            aria-label="Quantità"
          />
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Messaggio per la famiglia"
            className="flex-1 min-w-[120px] rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs"
          />
        </div>
        <select
          value={requestKey}
          onChange={(e) => setRequestKey(e.target.value)}
          className="w-full rounded-lg bg-night/60 border border-border px-2 py-1.5 text-xs"
        >
          <option value="">— richiedi in cambio (opzionale) —</option>
          {items.map((i) => (
            <option key={`req-${i.item_key}`} value={i.item_key}>{i.emoji} {i.item_name}</option>
          ))}
        </select>
        <button onClick={sendTrade} disabled={busy || !selectedKey} className="btn-neon w-full py-2 flex items-center justify-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Handshake className="h-3 w-3" />}
          Invia scambio a {them.name}
        </button>
      </div>

      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-primary/80">Ricevuti</p>
          {incoming.map((o) => (
            <TradeCard key={o.id} offer={o} onAccept={() => handleAccept(o.id)} onReject={() => handleReject(o.id)} busy={busy} />
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Inviati</p>
          {outgoing.map((o) => (
            <TradeCard key={o.id} offer={o} onReject={() => handleReject(o.id)} busy={busy} outgoing />
          ))}
        </div>
      )}

      {history.slice(0, 5).length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
            <History className="h-3 w-3" /> Storico
          </p>
          {history.slice(0, 5).map((h) => (
            <p key={h.id} className="text-[10px] text-muted-foreground market-card px-2 py-1">
              {h.action} · {new Date(h.created_at).toLocaleDateString("it-IT")}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function TradeCard({
  offer,
  onAccept,
  onReject,
  busy,
  outgoing = false,
}: {
  offer: FamilyTradeOfferFull;
  onAccept?: () => void;
  onReject: () => void;
  busy: boolean;
  outgoing?: boolean;
}) {
  const offered = offer.items.filter((i) => i.side === "offer");
  const requested = offer.items.filter((i) => i.side === "request");

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="market-card p-3 space-y-2">
      {offer.message && <p className="text-[10px] text-muted-foreground italic">"{offer.message}"</p>}
      <div className="flex flex-wrap gap-2">
        {offered.map((i) => (
          <span key={i.id} className="text-xs flex items-center gap-1 panel px-2 py-1">
            {i.emoji} {i.item_name} ×{i.quantity}
          </span>
        ))}
      </div>
      {requested.length > 0 && (
        <p className="text-[10px] text-primary">Richiede: {requested.map((i) => `${i.emoji} ${i.item_name}`).join(", ")}</p>
      )}
      <div className="flex gap-2">
        {!outgoing && onAccept && (
          <button onClick={onAccept} disabled={busy} className="btn-neon flex-1 py-1.5 text-xs flex items-center justify-center gap-1">
            <Check className="h-3 w-3" /> Accetta
          </button>
        )}
        <button onClick={onReject} disabled={busy} className="panel flex-1 py-1.5 text-xs flex items-center justify-center gap-1 text-destructive">
          <X className="h-3 w-3" /> {outgoing ? "Annulla" : "Rifiuta"}
        </button>
      </div>
    </motion.div>
  );
}
