import { useRef, useState, useCallback, useEffect, type ReactNode, type PointerEvent as RPE } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface Props {
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
}

/** Riquadro zoomabile + pan stile Google Maps.
 *  - Wheel / pinch: zoom centrato sul cursore
 *  - Drag: pan
 *  - Eventi confinati al riquadro (non toccano la bottom nav)
 */
export function VillageZoomPan({ children, minScale = 0.6, maxScale = 3 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);

  const clamp = useCallback(
    (s: number) => Math.max(minScale, Math.min(maxScale, s)),
    [minScale, maxScale],
  );

  /** Zoom centrato su un punto (in coordinate del riquadro). */
  const zoomAt = useCallback(
    (factor: number, cx: number, cy: number) => {
      setScale((prev) => {
        const next = clamp(prev * factor);
        const real = next / prev;
        // mantieni il punto (cx,cy) fermo durante lo zoom
        setTx((t) => cx - (cx - t) * real);
        setTy((t) => cy - (cy - t) * real);
        return next;
      });
    },
    [clamp],
  );

  const localPoint = (clientX: number, clientY: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return { x: clientX - r.left, y: clientY - r.top };
  };

  const onPointerDown = (e: RPE<HTMLDivElement>) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 1) {
      dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
      pinchRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = localPoint((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      pinchRef.current = { dist, cx: mid.x, cy: mid.y };
      dragRef.current = null;
    }
  };

  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    e.stopPropagation();
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = localPoint((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      const factor = dist / pinchRef.current.dist;
      zoomAt(factor, mid.x, mid.y);
      pinchRef.current = { dist, cx: mid.x, cy: mid.y };
      return;
    }
    if (dragRef.current) {
      setTx(dragRef.current.tx + (e.clientX - dragRef.current.x));
      setTy(dragRef.current.ty + (e.clientY - dragRef.current.y));
    }
  };

  const onPointerUp = (e: RPE<HTMLDivElement>) => {
    e.stopPropagation();
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  };

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  // wheel non-passivo confinato al riquadro: zoom centrato sul cursore
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      // solo se il puntatore è sopra al riquadro
      e.preventDefault();
      e.stopPropagation();
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(factor, cx, cy);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [zoomAt]);

  // i pulsanti zoomano sul centro del riquadro
  const zoomCenter = (factor: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    zoomAt(factor, r.width / 2, r.height / 2);
  };

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
      className="relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-black/40 touch-none select-none overscroll-contain"
      style={{
        aspectRatio: "16/11",
        minHeight: 360,
        cursor: dragRef.current ? "grabbing" : "grab",
        isolation: "isolate",
        contain: "layout paint",
      }}
    >
      <div
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
          transition: dragRef.current || pinchRef.current ? "none" : "transform 0.1s ease-out",
        }}
      >
        {children}
      </div>

      {/* zoom toolbar */}
      <div className="absolute right-2 bottom-2 flex flex-col gap-1 z-30 pointer-events-auto">
        <button
          aria-label="Zoom +"
          onClick={() => zoomCenter(1.25)}
          className="panel-strong p-2 hover:bg-primary/20 active:scale-95 transition"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          aria-label="Zoom -"
          onClick={() => zoomCenter(1 / 1.25)}
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
