import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { getSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { hapticTap } from "@/lib/haptic";
import { getCoins } from "@/lib/coins";
import {
  BaseRow,
  BaseBuilding,
  BuildingCatalog,
  THEMES,
  fetchCatalog,
  getBase,
  listBuildings,
  boostBuilding,
  sendGift,
  formatRemaining,
  buildingStage,
} from "@/lib/base";
import { ArrowLeft, Gift, Zap, Heart } from "lucide-react";

export const Route = createFileRoute("/villaggio/$agent")({
  component: PartnerBasePage,
});

function PartnerBasePage() {
  const { agent: target } = useParams({ from: "/villaggio/$agent" });
  const session = typeof window !== "undefined" ? getSession() : null;
  const me = session?.role ?? "lorenzo";

  const [base, setBase] = useState<BaseRow | null>(null);
  const [buildings, setBuildings] = useState<BaseBuilding[]>([]);
  const [catalog, setCatalog] = useState<BuildingCatalog[]>([]);
  const [myCoins, setMyCoins] = useState(0);
  const [tick, setTick] = useState(0);
  const [showGift, setShowGift] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);
  void tick;

  const reload = async () => {
    const [b, bld, cat, c] = await Promise.all([
      getBase(target),
      listBuildings(target),
      fetchCatalog(),
      getCoins(me),
    ]);
    setBase(b);
    setBuildings(bld);
    setCatalog(cat);
    setMyCoins(c);
  };

  useEffect(() => {
    reload();
    const ch = supabase
      .channel("villaggio-visit:" + target)
      .on("postgres_changes", { event: "*", schema: "public", table: "base_buildings", filter: `agent=eq.${target}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "bases", filter: `agent=eq.${target}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line
  }, [target]);

  if (!base) {
    return (
      <PageShell title={`Base di ${target}`} subtitle="Non ancora fondata">
        <div className="panel p-6 text-center text-sm text-muted-foreground">
          {target} non ha ancora fondato il proprio villaggio.
        </div>
        <Link to="/villaggio" className="panel flex items-center gap-2 p-3 text-sm">
          <ArrowLeft className="h-4 w-4" /> Torna alla tua base
        </Link>
      </PageShell>
    );
  }

  const theme = THEMES[base.theme] ?? THEMES.foresta;
  const cat = (k: string) => catalog.find((c) => c.key === k);
  const buildingInProgress = buildings.find((b) => b.status !== "idle");

  return (
    <PageShell
      title={base.name}
      subtitle={`Visita a ${target} · Lv ${base.level} · ${theme.label}`}
      action={
        <Link to="/villaggio" onClick={hapticTap} className="panel px-2 py-1 text-[11px] flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Mia base
        </Link>
      }
    >
      {/* Scena read-only */}
      <div className="panel-strong relative overflow-hidden" style={{ aspectRatio: "16 / 11" }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.sky} 0%, ${theme.sky} 55%, ${theme.ground} 100%)` }} />
        <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: `linear-gradient(180deg, transparent, ${theme.ground})` }} />
        <div className="absolute top-2 left-2 panel px-2 py-1 text-[10px]">👁️ Visitatore</div>
        {buildings.map((b) => {
          const c = cat(b.type);
          if (!c) return null;
          const stage = buildingStage(b.level);
          const scale = stage === "maestro" ? 1.25 : stage === "evoluto" ? 1.1 : 1;
          return (
            <div
              key={b.id}
              className="absolute flex flex-col items-center"
              style={{ left: `${b.position_x}%`, bottom: `${b.position_y}%`, transform: `translate(-50%, 50%) scale(${scale})` }}
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="mt-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-night/80 text-foreground/80 border border-primary/20">
                Lv {b.level}
              </span>
            </div>
          );
        })}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute text-base"
            style={{ bottom: 6 + (i % 2) * 8 }}
            initial={{ left: `${15 + i * 20}%` }}
            animate={{ left: [`${15 + i * 20}%`, `${75 - i * 8}%`, `${15 + i * 20}%`] }}
            transition={{ duration: 16 + i * 3, repeat: Infinity, ease: "linear" }}
          >
            🌱
          </motion.span>
        ))}
      </div>

      {/* Azioni */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { hapticTap(); setShowGift(true); }} className="panel-strong p-3 flex flex-col items-center gap-1">
          <Gift className="h-5 w-5 text-primary" />
          <span className="text-xs">Invia regalo</span>
        </button>
        <button
          disabled={!buildingInProgress}
          onClick={async () => {
            if (!buildingInProgress) return;
            hapticTap();
            await boostBuilding(me, buildingInProgress, 5);
            reload();
          }}
          className="panel-strong p-3 flex flex-col items-center gap-1 disabled:opacity-50"
        >
          <Zap className="h-5 w-5 text-primary" />
          <span className="text-xs">Boost -5min</span>
        </button>
      </div>

      {/* Lista strutture */}
      <div className="panel p-3 space-y-2">
        <p className="text-[11px] uppercase tracking-widest text-primary">Strutture</p>
        {buildings.length === 0 && <p className="text-xs text-muted-foreground">Ancora nessuna struttura.</p>}
        {buildings.map((b) => {
          const c = cat(b.type);
          if (!c) return null;
          return (
            <div key={b.id} className="flex items-center gap-3 rounded-lg bg-night/60 p-2 border border-primary/10">
              <span className="text-2xl">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {b.status === "idle" ? `Lv ${b.level}` : `🔨 ${formatRemaining(b.build_end_at)}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {showGift && (
          <GiftModal
            me={me}
            target={target}
            myCoins={myCoins}
            onClose={() => setShowGift(false)}
            onSent={() => {
              setShowGift(false);
              reload();
            }}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

function GiftModal({
  me,
  target,
  myCoins,
  onClose,
  onSent,
}: {
  me: string;
  target: string;
  myCoins: number;
  onClose: () => void;
  onSent: () => void;
}) {
  const [coins, setCoins] = useState(10);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-night/80 backdrop-blur flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        className="panel-strong w-full max-w-md p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg">Regalo per {target}</h3>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-primary">Monete (max {myCoins})</label>
          <input
            type="number"
            min={0}
            max={myCoins}
            value={coins}
            onChange={(e) => setCoins(Math.min(myCoins, Math.max(0, Number(e.target.value))))}
            className="mt-1 w-full bg-night/60 border border-primary/30 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-widest text-primary">Messaggio (opzionale)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Forza! 🌱"
            className="mt-1 w-full bg-night/60 border border-primary/30 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="panel flex-1 py-2 text-xs">Annulla</button>
          <button
            disabled={busy || coins <= 0}
            onClick={async () => {
              setBusy(true);
              try {
                await sendGift({ from: me, to: target, coins, message: message.trim() || undefined });
                onSent();
              } catch (e: any) {
                alert(e.message);
              } finally {
                setBusy(false);
              }
            }}
            className="btn-neon flex-1 py-2 text-xs disabled:opacity-50"
          >
            {busy ? "Invio…" : "Invia"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
