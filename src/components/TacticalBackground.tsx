import { useEffect, useRef } from "react";

/**
 * Sfondo tattico globale: griglia HUD + particelle che fluttuano
 * + scan line lenta. Pensato per stare dietro a tutta l'app.
 */
export function TacticalBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    const particles: P[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(60, Math.floor((w * h) / 22000));
      particles.length = 0;
      for (let i = 0; i < target; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          r: Math.random() * 1.4 + 0.4,
          a: Math.random() * 0.5 + 0.2,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // particelle
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.fillStyle = `rgba(140, 255, 180, ${p.a})`;
        ctx.shadowColor = "rgba(140,255,180,0.6)";
        ctx.shadowBlur = 6;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      // connessioni leggere
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 90 * 90) {
            const alpha = 0.08 * (1 - Math.sqrt(d2) / 90);
            ctx.strokeStyle = `rgba(140,255,180,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* gradient base */}
      <div className="absolute inset-0 grid-bg opacity-50" />
      {/* canvas particelle */}
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* scan line lenta */}
      <div className="absolute inset-x-0 h-24 opacity-30 animate-tactical-scan" style={{
        background: "linear-gradient(to bottom, transparent, oklch(0.86 0.24 145 / 0.18), transparent)",
      }} />
      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)" }}
      />
      {/* HUD coordinate angolari */}
      <div className="absolute top-2 left-3 text-[9px] font-mono text-primary/40 tracking-widest uppercase">
        SECT-04 · LIVE
      </div>
      <div className="absolute top-2 right-3 text-[9px] font-mono text-primary/40 tracking-widest uppercase">
        SIG ▮▮▮▯ · 4G
      </div>
    </div>
  );
}
