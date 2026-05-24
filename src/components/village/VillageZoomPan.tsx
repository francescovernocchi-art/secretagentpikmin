import { useRef, useState, useCallback, useEffect, type ReactNode, type PointerEvent as RPE, type WheelEvent as RWE } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Props {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
}

/** Riquadro zoomabile + pan stile "Wandering Village".
 *  Wheel / pinch per zoom, drag per spostare. Toolbar +/-/reset. */
export function VillageZoomPan({ children, minScale = 0.6, maxScale = 2.5 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchDist = useRef<number | null>(null);

  const clamp = useCallback(
    (s: number) => Math.max(minScale, Math.min(maxScale, s)),
    [minScale, maxScale],
  );

  const onWheel = useCallback(
    (e: RWE<HTMLDivElement>) => {
      if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setScale((s) => clamp(s * factor));
    },
    [clamp],
  );

  const onPointerDown = (e: RPE<HTMLDivElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current.size === 1) {
      dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
    } else if (pinchRef.current.size === 2) {
      const pts = Array.from(pinchRef.current.values());
      pinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    if (!pinchRef.current.has(e.pointerId)) return;
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current.size === 2 && pinchDist.current != null) {
      const pts = Array.from(pinchRef.current.values());
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      setScale((s) => clamp(s * (d / pinchDist.current!)));
      pinchDist.current = d;
      return;
    }
    if (dragRef.current) {
      setTx(dragRef.current.tx + (e.clientX - dragRef.current.x));
      setTy(dragRef.current.ty + (e.clientY - dragRef.current.y));
    }
  };

  const onPointerUp = (e: RPE<HTMLDivElement>) => {
    pinchRef.current.delete(e.pointerId);
    if (pinchRef.current.size < 2) pinchDist.current = null;
    if (pinchRef.current.size === 0) dragRef.current = null;
  };

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  // attach non-passive wheel listener so preventDefault works
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setScale((s) => clamp(s * factor));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [clamp]);

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      className="relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-black/40 touch-none"
      style={{ aspectRatio: "16/11", minHeight: 360, cursor: dragRef.current ? "grabbing" : "grab" }}
    >
      <div
        className="absolute inset-0 origin-center will-change-transform"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: dragRef.current ? "none" : "transform 0.12s ease-out",
        }}
      >
        {children}
      </div>

      {/* zoom toolbar */}
      <div className="absolute right-2 bottom-2 flex flex-col gap-1 z-30 pointer-events-auto">
        <button
          aria-label="Zoom +"
          onClick={() => setScale((s) => clamp(s * 1.2))}
          className="panel-strong p-2 hover:bg-primary/20 active:scale-95 transition"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          aria-label="Zoom -"
          onClick={() => setScale((s) => clamp(s / 1.2))}
          className="panel-strong p-2 hover:bg-primary/20 active:scale-95 transition"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          aria-label="Reset vista"
          onClick={reset}
          className="panel-strong p-2 hover:bg-primary/20 active:scale-95 transition"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute left-2 bottom-2 z-30 text-[10px] font-mono panel-strong px-2 py-1 pointer-events-none opacity-70">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
