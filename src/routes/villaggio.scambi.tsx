import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { hapticTap } from "@/lib/haptic";
import { sfx } from "@/lib/sfx";
import { getSession } from "@/lib/session";
import { getCoins } from "@/lib/coins";
import { getPikminCount } from "@/lib/pikmin";
import { supabase } from "@/integrations/supabase/client";
import { PARTNER_OF } from "@/lib/base";
import {
  TradeOffer,
  TradeBundle,
  acceptOffer,
  bundleLabel,
  cancelOffer,
  createOffer,
  declineOffer,
  getAmbasciataLevel,
  listMyOffers,
  maxOpenSlots,
} from "@/lib/trade";
import { ArrowLeft, Handshake, Lock, Plus, Send, Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/villaggio/scambi")({
  component: ScambiPage,
  head: () => ({
    meta: [
      { title: "Scambi Pikmin · Ambasciata" },
      { name: "description", content: "Scambia Pikmin, ingredienti e monete con il partner via Ambasciata." },
    ],
  }),
});

function ScambiPage() {
  const session = typeof window !== "undefined" ? getSession() : null;
  const me = session?.role ?? "lorenzo";
  const partner = PARTNER_OF[me];

  const [level, setLevel] = useState(0);
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [coins, setCoins] = useState(0);
  const [pikmin, setPikmin] = useState(0);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [composer, setComposer] = useState(false);
  const [filter, setFilter] = useState<"all" | "in" | "out" | "done">("all");

  const reload = async () => {
    const [lvl, list, c, p, inv] = await Promise.all([
      getAmbasciataLevel(me),
      listMyOffers(me),
      getCoins(me),
      getPikminCount(),
      supabase.from("inventory").select("ingredient_key, qty").eq("agent", me),
    ]);
    setLevel(lvl);
    setOffers(list);
    setCoins(c);
    setPikmin(p);
    const map: Record<string, number> = {};
    (inv.data ?? []).forEach((r: any) => (map[r.ingredient_key] = r.qty));
    setInventory(map);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("trade:" + me)
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_offers" }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const visible = useMemo(() => {
    if (filter === "in") return offers.filter((o) => o.to_agent === me && o.status === "pending");
    if (filter === "out") return offers.filter((o) => o.from_agent === me && o.status === "pending");
    if (filter === "done") return offers.filter((o) => o.status !== "pending");
    return offers;
  }, [offers, filter, me]);

  if (level < 1) {
    return (
      <PageShell
        title="Scambi bloccati"
        subtitle="Costruisci l'Ambasciata per attivare la rotta di scambio"
        action={
          <Link to="/villaggio" onClick={hapticTap} className="panel px-2 py-1 text-[11px] flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Villaggio
          </Link>
        }
      >
        <div className="panel-strong p-6 text-center space-y-3">
          <div className="text-5xl">🤝</div>
          <p className="text-sm">
            Senza <b>Ambasciata</b> attiva, Papà e Lorenzo non possono scambiare Pikmin, ingredienti o monete.
          </p>
          <p className="text-xs text-muted-foreground">
            Vai in <b>Edifici</b> e costruisci almeno il livello 1.
          </p>
          <Link to="/villaggio/edifici" onClick={hapticTap} className="btn-neon inline-flex items-center gap-1 px-3 py-2 text-xs">
            <Lock className="h-3 w-3" /> Vai agli Edifici
          </Link>
        </div>
      </PageShell>
    );
  }

  const usedSlots = offers.filter((o) => o.from_agent === me && o.status === "pending").length;
  const slots = maxOpenSlots(level);

  return (
    <PageShell
      title="Ambasciata"
      subtitle={`Scambi con ${partner} · Lv ${level} · slot ${usedSlots}/${slots}`}
      action={
        <div className="flex items-center gap-2">
          <span className="panel px-2 py-1 text-[11px] flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> {coins}
          </span>
          <Link to="/villaggio" onClick={hapticTap} className="panel px-2 py-1 text-[11px] flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Villag.
          </Link>
        </div>
      }
    >
      {/* Header riepilogo */}
      <div className="panel-strong p-3 flex items-center gap-3">
        <span className="text-3xl">🤝</span>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-primary">Rotta attiva</p>
          <p className="text-sm">
            {me} ↔ {partner}
          </p>
        </div>
        <button
          onClick={() => {
            hapticTap();
            setComposer(true);
          }}
          disabled={usedSlots >= slots}
          className="btn-neon flex items-center gap-1 px-3 py-2 text-xs disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> Nuovo
        </button>
      </div>

      {/* Filtri */}
      <div className="flex gap-1.5">
        {(["all", "in", "out", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => {
              hapticTap();
              setFilter(f);
            }}
            className={`panel flex-1 px-2 py-1.5 text-[10px] uppercase tracking-widest ${filter === f ? "ring-2 ring-primary text-primary" : "text-muted-foreground"}`}
          >
            {f === "all" ? "Tutte" : f === "in" ? "Ricevute" : f === "out" ? "Inviate" : "Storico"}
          </button>
        ))}
      </div>

      {/* Lista offerte */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="panel p-6 text-center text-xs text-muted-foreground">Nessuna offerta in questa vista.</div>
        )}
        {visible.map((o) => (
          <OfferCard key={o.id} o={o} me={me} onChanged={reload} />
        ))}
      </div>

      <AnimatePresence>
        {composer && (
          <ComposerModal
            me={me}
            partner={partner}
            coins={coins}
            pikmin={pikmin}
            inventory={inventory}
            onClose={() => setComposer(false)}
            onSent={() => {
              setComposer(false);
              reload();
            }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function OfferCard({ o, me, onChanged }: { o: TradeOffer; me: string; onChanged: () => void }) {
  const mine = o.from_agent === me;
  const statusColor: Record<TradeOffer["status"], string> = {
    pending: "text-amber-300",
    accepted: "text-emerald-300",
    declined: "text-rose-300",
    cancelled: "text-muted-foreground",
    expired: "text-muted-foreground",
  };
  const STATUS_LABEL: Record<TradeOffer["status"], string> = {
    pending: "In attesa",
    accepted: "Accettata",
    declined: "Rifiutata",
    cancelled: "Annullata",
    expired: "Scaduta",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel-strong p-3 space-y-2"
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
        <span className="text-muted-foreground">
          {mine ? "Inviata a" : "Ricevuta da"} <b className="text-foreground">{mine ? o.to_agent : o.from_agent}</b>
        </span>
        <span className={statusColor[o.status]}>{STATUS_LABEL[o.status]}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="rounded-lg bg-night/60 border border-primary/20 p-2 text-xs">
          <p className="text-[9px] uppercase tracking-widest text-primary mb-0.5">Offre</p>
          <p>{bundleLabel(o.offer)}</p>
        </div>
        <Handshake className="h-5 w-5 text-primary" />
        <div className="rounded-lg bg-night/60 border border-primary/20 p-2 text-xs">
          <p className="text-[9px] uppercase tracking-widest text-primary mb-0.5">Chiede</p>
          <p>{bundleLabel(o.request)}</p>
        </div>
      </div>
      {o.message && <p className="text-[11px] italic text-muted-foreground">"{o.message}"</p>}
      {o.status === "pending" && (
        <div className="flex gap-2">
          {mine ? (
            <button
              onClick={async () => {
                hapticTap();
                await cancelOffer(me, o);
                onChanged();
              }}
              className="panel flex-1 py-1.5 text-[11px]"
            >
              Annulla
            </button>
          ) : (
            <>
              <button
                onClick={async () => {
                  hapticTap();
                  await declineOffer(me, o);
                  onChanged();
                }}
                className="panel flex-1 py-1.5 text-[11px]"
              >
                Rifiuta
              </button>
              <button
                onClick={async () => {
                  hapticTap();
                  try {
                    await acceptOffer(me, o);
                    sfx.gift();
                    onChanged();
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="btn-neon flex-1 py-1.5 text-[11px]"
              >
                Accetta
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ComposerModal({
  me,
  partner,
  coins,
  pikmin,
  inventory,
  onClose,
  onSent,
}: {
  me: string;
  partner: string;
  coins: number;
  pikmin: number;
  inventory: Record<string, number>;
  onClose: () => void;
  onSent: () => void;
}) {
  const [offer, setOffer] = useState<TradeBundle>({});
  const [request, setRequest] = useState<TradeBundle>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const addIngredient = (side: "offer" | "request", key: string) => {
    const set = side === "offer" ? setOffer : setRequest;
    const cur = side === "offer" ? offer : request;
    set({ ...cur, ingredients: [...(cur.ingredients ?? []), key] });
  };
  const removeIngredient = (side: "offer" | "request", idx: number) => {
    const set = side === "offer" ? setOffer : setRequest;
    const cur = side === "offer" ? offer : request;
    const next = [...(cur.ingredients ?? [])];
    next.splice(idx, 1);
    set({ ...cur, ingredients: next });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-night/85 backdrop-blur flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="panel-strong w-full max-w-md p-4 space-y-3 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">Nuovo scambio con {partner}</h3>
          <button onClick={onClose} className="panel p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* OFFERTA */}
        <BundleEditor
          title="Tu offri"
          bundle={offer}
          setBundle={setOffer}
          maxCoins={coins}
          maxPikmin={pikmin}
          inventory={inventory}
          onAddIng={(k) => addIngredient("offer", k)}
          onRemoveIng={(i) => removeIngredient("offer", i)}
        />

        {/* RICHIESTA */}
        <BundleEditor
          title={`Chiedi a ${partner}`}
          bundle={request}
          setBundle={setRequest}
          // no max constraints — partner deciderà
          inventory={{}}
          onAddIng={(k) => addIngredient("request", k)}
          onRemoveIng={(i) => removeIngredient("request", i)}
          freeIngredients
        />

        <div>
          <label className="text-[10px] uppercase tracking-widest text-primary">Messaggio (opzionale)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Ti serve? Te lo mando! 🌱"
            className="mt-1 w-full bg-night/60 border border-primary/30 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          disabled={busy}
          onClick={async () => {
            hapticTap();
            setBusy(true);
            try {
              await createOffer({ from: me, to: partner, offer, request, message: message.trim() || undefined });
              sfx.build();
              onSent();
            } catch (e: any) {
              alert(e.message);
            } finally {
              setBusy(false);
            }
          }}
          className="btn-neon w-full py-2.5 text-sm flex items-center justify-center gap-1.5"
        >
          <Send className="h-4 w-4" /> {busy ? "Invio…" : "Invia offerta"}
        </button>
      </motion.div>
    </motion.div>
  );
}

function BundleEditor({
  title,
  bundle,
  setBundle,
  maxCoins,
  maxPikmin,
  inventory,
  onAddIng,
  onRemoveIng,
  freeIngredients,
}: {
  title: string;
  bundle: TradeBundle;
  setBundle: (b: TradeBundle) => void;
  maxCoins?: number;
  maxPikmin?: number;
  inventory: Record<string, number>;
  onAddIng: (k: string) => void;
  onRemoveIng: (i: number) => void;
  freeIngredients?: boolean;
}) {
  const [ingInput, setIngInput] = useState("");
  return (
    <div className="rounded-lg bg-night/60 border border-primary/20 p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-primary">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-muted-foreground">
          💰 Monete{maxCoins !== undefined && ` (max ${maxCoins})`}
          <input
            type="number"
            min={0}
            max={maxCoins}
            value={bundle.coins ?? 0}
            onChange={(e) => {
              const n = Math.max(0, Number(e.target.value));
              setBundle({ ...bundle, coins: maxCoins !== undefined ? Math.min(maxCoins, n) : n });
            }}
            className="mt-1 w-full bg-night/70 border border-primary/30 rounded-md px-2 py-1 text-sm"
          />
        </label>
        <label className="text-[11px] text-muted-foreground">
          🌱 Pikmin{maxPikmin !== undefined && ` (max ${maxPikmin})`}
          <input
            type="number"
            min={0}
            max={maxPikmin}
            value={bundle.pikmin ?? 0}
            onChange={(e) => {
              const n = Math.max(0, Number(e.target.value));
              setBundle({ ...bundle, pikmin: maxPikmin !== undefined ? Math.min(maxPikmin, n) : n });
            }}
            className="mt-1 w-full bg-night/70 border border-primary/30 rounded-md px-2 py-1 text-sm"
          />
        </label>
      </div>

      {/* Ingredienti scelti */}
      {(bundle.ingredients ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(bundle.ingredients ?? []).map((k, i) => (
            <button
              key={i}
              onClick={() => onRemoveIng(i)}
              className="panel px-2 py-0.5 text-[11px] flex items-center gap-1"
            >
              🍃 {k} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      {/* Aggiungi ingrediente */}
      {freeIngredients ? (
        <div className="flex gap-1">
          <input
            value={ingInput}
            onChange={(e) => setIngInput(e.target.value)}
            placeholder="chiave ingrediente"
            className="flex-1 bg-night/70 border border-primary/30 rounded-md px-2 py-1 text-xs"
          />
          <button
            onClick={() => {
              if (ingInput.trim()) {
                onAddIng(ingInput.trim());
                setIngInput("");
              }
            }}
            className="panel px-2 text-[11px]"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {Object.entries(inventory).length === 0 && (
            <span className="text-[11px] text-muted-foreground">Inventario vuoto.</span>
          )}
          {Object.entries(inventory).map(([k, q]) => {
            const used = (bundle.ingredients ?? []).filter((x) => x === k).length;
            const left = q - used;
            return (
              <button
                key={k}
                disabled={left <= 0}
                onClick={() => onAddIng(k)}
                className="panel px-2 py-0.5 text-[11px] disabled:opacity-40"
              >
                🍃 {k} <span className="text-muted-foreground">×{left}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
