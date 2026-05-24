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
  maxScale?: number;
  initialScale?: number;
  /** Altezza visibile (px) — opzionale; se omesso il container occupa il parent. */
  height?: number | string;
  /** Colore di sfondo (di solito tinta del bioma) per evitare il bordo nero quando si pizzica. */
  backgroundColor?: string;
  onScaleChange?: (s: number) => void;
  onWorldClick?: (worldX: number, worldY: number) => void;
}

/**
 * Pan + pinch/wheel zoom. minScale calcolato dinamicamente in modo che il
 * mondo COPRA SEMPRE il viewport (mai bordo visibile). Sfondo configurabile.
 */
export const VillageMapViewport = forwardRef<ViewportHandle, Props>(function VillageMapViewport(
  {
    worldWidth,
    worldHeight,
    children,
    maxScale = 3,
    initialScale = 1,
    height,
    backgroundColor = "#0a0a0a",
    onScaleChange,
    onWorldClick,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ w: 600, h: 600 });
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [scale, setScale] = useState(initialScale);

  // minScale dinamico: garantisce che il mondo riempia sempre il viewport.
  const minScale = Math.max(vp.w / worldWidth, vp.h / worldHeight, 0.1);

  const dragRef = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number; vx: number; vy: number; lastT: number; moved: boolean }>({
    active: false, sx: 0, sy: 0, ox: 0, oy: 0, vx: 0, vy: 0, lastT: 0, moved: false,
  });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; scale: number; cx: number; cy: number } | null>(null);

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

  // Auto-fit iniziale + clamp quando cambia minScale
  useEffect(() => {
    if (vp.w < 200) return;
    const s = Math.max(minScale, initialScale);
    setScale(s);
    const nx = vp.w / 2 - (worldWidth / 2) * s;
    const ny = vp.h / 2 - (worldHeight / 2) * s;
    const c = clampPan(nx, ny, s);
    setTx(c.x); setTy(c.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.w, vp.h]);

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAt(scale * 1.25, vp.w / 2, vp.h / 2),
    zoomOut: () => zoomAt(scale / 1.25, vp.w / 2, vp.h / 2),
    reset: () => {
      const s = Math.max(minScale, initialScale);
      setScale(s);
      const nx = vp.w / 2 - (worldWidth / 2) * s;
      const ny = vp.h / 2 - (worldHeight / 2) * s;
      const c = clampPan(nx, ny, s);
      setTx(c.x); setTy(c.y);
    },
    centerOn,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [scale, vp.w, vp.h, tx, ty, minScale]);

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

  // Wheel zoom
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
        ox: tx, oy: ty, vx: 0, vy: 0, lastT: performance.now(), moved: false,
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
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    const now = performance.now();
    const dt = Math.max(1, now - d.lastT);
    d.vx = (e.clientX - d.sx - (tx - d.ox)) / dt * 16;
    d.vy = (e.clientY - d.sy - (ty - d.oy)) / dt * 16;
    d.lastT = now;
    setPan(d.ox + dx, d.oy + dy, scale);
    e.stopPropagation();
  };

  const endPointer = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const wasTap = d.active && !d.moved && pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchRef.current = null;
    if (pointers.current.size === 0) dragRef.current.active = false;
    // tap su mondo → callback (per placement)
    if (wasTap && onWorldClick && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const wx = (cx - tx) / scale;
      const wy = (cy - ty) / scale;
      onWorldClick(wx, wy);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        height: height ?? "100%",
        backgroundColor,
        touchAction: "none",
        overscrollBehavior: "contain",
        contain: "layout paint",
      }}
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
