import { useEffect, useImperativeHandle, useRef, useState, forwardRef, type ReactNode } from "react";

export interface ViewportHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  centerOn: (x: number, y: number) => void;
}

interface Props {
  worldWidth: number;
  worldHeight: number;
  children: ReactNode;
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  /** Altezza visibile del viewport (px). */
  height?: number;
  onScaleChange?: (s: number) => void;
}

/**
 * Pan + pinch/wheel zoom su una scena world fissa. Inerzia leggera, clamp ai bordi.
 * Non interferisce con scroll esterno (touch-action: none, stopPropagation).
 */
export const VillageMapViewport = forwardRef<ViewportHandle, Props>(function VillageMapViewport(
  {
    worldWidth,
    worldHeight,
    children,
    minScale = 0.35,
    maxScale = 2.5,
    initialScale = 0.8,
    height = 480,
    onScaleChange,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 600, h: height });
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(initialScale);

  const dragRef = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number; vx: number; vy: number; lastT: number }>({
    active: false, sx: 0, sy: 0, ox: 0, oy: 0, vx: 0, vy: 0, lastT: 0,
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; scale: number; cx: number; cy: number } | null>(null);

  // Misura viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((e) => {
      const r = e[0].contentRect;
      setVp({ w: Math.max(200, r.width), h: Math.max(200, r.height) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { onScaleChange?.(scale); }, [scale, onScaleChange]);

  const clampPan = (x: number, y: number, s: number) => {
    const minX = vp.w - worldWidth * s;
    const minY = vp.h - worldHeight * s;
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  };

  const setPan = (x: number, y: number, s = scale) => {
    const c = clampPan(x, y, s);
    setTx(c.x); setTy(c.y);
  };

  const zoomAt = (newScale: number, cx: number, cy: number) => {
    const s = Math.max(minScale, Math.min(maxScale, newScale));
    // mantieni punto (cx,cy) fisso
    const wx = (cx - tx) / scale;
    const wy = (cy - ty) / scale;
    const nx = cx - wx * s;
    const ny = cy - wy * s;
    const c = clampPan(nx, ny, s);
    setScale(s); setTx(c.x); setTy(c.y);
  };

  const centerOn = (wx: number, wy: number) => {
    const nx = vp.w / 2 - wx * scale;
    const ny = vp.h / 2 - wy * scale;
    setPan(nx, ny, scale);
  };

  // Centra all'avvio
  useEffect(() => {
    if (vp.w > 200) centerOn(worldWidth / 2, worldHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.w, vp.h]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAt(scale * 1.25, vp.w / 2, vp.h / 2),
    zoomOut: () => zoomAt(scale / 1.25, vp.w / 2, vp.h / 2),
    reset: () => { setScale(initialScale); centerOn(worldWidth / 2, worldHeight / 2); },
    centerOn,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [scale, vp.w, vp.h, tx, ty]);

  // Inerzia
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const d = dragRef.current;
      if (!d.active && (Math.abs(d.vx) > 0.05 || Math.abs(d.vy) > 0.05)) {
        d.vx *= 0.92; d.vy *= 0.92;
        setPan(tx + d.vx, ty + d.vy, scale);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx, ty, scale, vp.w, vp.h]);

  // Wheel zoom (solo se il puntatore è sopra il container)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); e.stopPropagation();
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      zoomAt(scale * factor, cx, cy);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, tx, ty, vp.w, vp.h]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchRef.current = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        scale,
        cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2,
      };
      dragRef.current.active = false;
    } else {
      dragRef.current = {
        active: true, sx: e.clientX, sy: e.clientY,
        ox: tx, oy: ty, vx: 0, vy: 0, lastT: performance.now(),
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinchRef.current && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const target = pinchRef.current.scale * (d / pinchRef.current.dist);
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      zoomAt(target, pinchRef.current.cx - r.left, pinchRef.current.cy - r.top);
      e.stopPropagation();
      return;
    }
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vx = (e.clientX - d.sx - (tx - d.ox)) / dt * 16;
    d.vy = (e.clientY - d.sy - (ty - d.oy)) / dt * 16;
    d.lastT = now;
    setPan(d.ox + dx, d.oy + dy, scale);
    e.stopPropagation();
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) dragRef.current.active = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-black/30 select-none"
      style={{ height, touchAction: "none", overscrollBehavior: "contain", contain: "layout paint" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
    >
      <div
        style={{
          position: "absolute",
          left: 0, top: 0,
          width: worldWidth, height: worldHeight,
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
});
