import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { hapticTap } from "@/lib/haptic";
import { addWall, deleteWall, WallSegment, WALL_MATERIALS } from "@/lib/village/walls";
import { spendCoins } from "@/lib/coins";

interface Props {
  agent: string;
  walls: WallSegment[];
  coins: number;
  onClose: () => void;
  onChange: () => void;
}

/** Editor muri: tap due punti per creare un segmento, tap su un muro per cancellarlo. */
export function WallEditor({ agent, walls, coins, onClose, onChange }: Props) {
  const [material, setMaterial] = useState("wood");
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const mat = WALL_MATERIALS[material];
  const canAfford = coins >= mat.cost;

  const handleBoardClick = async (e: React.MouseEvent) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = 100 - ((e.clientY - rect.top) / rect.height) * 100;
    // snap a 5%
    const sx = Math.round(x / 5) * 5;
    const sy = Math.round(y / 5) * 5;
    hapticTap();

    if (!pending) {
      setPending({ x: sx, y: sy });
      return;
    }
    if (Math.abs(pending.x - sx) < 2 && Math.abs(pending.y - sy) < 2) {
      setPending(null);
      return;
    }
    if (!canAfford) {
      setErr(`Servono ${mat.cost}💰 per un segmento ${mat.label}.`);
      setPending(null);
      return;
    }
    try {
      const paid = await spendCoins(agent, mat.cost, "wall_build", { material });
      if (!paid) throw new Error("Monete insufficienti");
      await addWall({ agent, from: pending, to: { x: sx, y: sy }, material });
      setPending(null);
      setErr(null);
      onChange();
    } catch (e: any) {
      setErr(e.message ?? "Errore");
      setPending(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-night/80 backdrop-blur flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        className="panel-strong w-full max-w-md p-3 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base">🧱 Editor mura</h3>
          <button onClick={onClose} className="panel p-1.5"><X className="h-3 w-3" /></button>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary mb-1">Materiale</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(WALL_MATERIALS).map(([k, m]) => (
              <button
                key={k}
                onClick={() => { hapticTap(); setMaterial(k); }}
                className={`panel p-1.5 text-[10px] text-center ${material === k ? "ring-2 ring-primary" : ""}`}
              >
                <div className="h-1.5 rounded mb-1" style={{ background: m.color }} />
                <p className="font-semibold">{m.label}</p>
                <p className="text-[9px] text-muted-foreground">+{m.defense} · {m.cost}💰</p>
              </button>
            ))}
          </div>
        </div>

        <div
          ref={boardRef}
          onClick={handleBoardClick}
          className="relative w-full bg-night/60 border border-primary/30 rounded-lg overflow-hidden cursor-crosshair"
          style={{ aspectRatio: "16 / 11" }}
        >
          {/* griglia */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(125,211,252,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.25) 1px, transparent 1px)",
              backgroundSize: "5% 5%",
            }}
          />
          {/* muri esistenti */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {walls.map((w) => {
              const m = WALL_MATERIALS[w.material] ?? WALL_MATERIALS.wood;
              return (
                <g key={w.id} style={{ cursor: "pointer" }} onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Eliminare segmento ${m.label}?`)) {
                    await deleteWall(w.id);
                    onChange();
                  }
                }}>
                  <line
                    x1={w.from_x} y1={100 - w.from_y} x2={w.to_x} y2={100 - w.to_y}
                    stroke={m.color} strokeWidth={1 + w.level * 0.4} strokeLinecap="round"
                  />
                  <circle cx={w.from_x} cy={100 - w.from_y} r={1} fill={m.color} />
                  <circle cx={w.to_x} cy={100 - w.to_y} r={1} fill={m.color} />
                </g>
              );
            })}
            {pending && (
              <circle cx={pending.x} cy={100 - pending.y} r={1.5} fill={mat.color} className="animate-pulse" />
            )}
          </svg>
          {/* hint */}
          <div className="absolute bottom-1 left-1 right-1 text-center text-[10px] text-foreground/60 bg-night/50 rounded py-0.5">
            {pending ? "Tocca il secondo punto" : "Tocca per iniziare un segmento · Tocca un muro per eliminarlo"}
          </div>
        </div>

        {err && <p className="text-[11px] text-red-400">{err}</p>}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{walls.length} segmenti · 💰 {coins}</span>
          <button onClick={onClose} className="panel px-3 py-1 text-[11px]">Fatto</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
