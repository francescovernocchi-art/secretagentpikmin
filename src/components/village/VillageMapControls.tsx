import { ZoomIn, ZoomOut, Maximize2, Crosshair } from "lucide-react";

interface Props {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onCenterBase: () => void;
}

/** Controlli mappa: SEMPRE fissi, non zoomati. Pensati per touch mobile. */
export function VillageMapControls({ scale, onZoomIn, onZoomOut, onReset, onCenterBase }: Props) {
  const btn = "panel-strong w-11 h-11 flex items-center justify-center active:scale-90 transition shadow-lg backdrop-blur-md";
  return (
    <div className="absolute top-2 right-2 z-30 flex flex-col gap-1.5 pointer-events-auto">
      <button onClick={onZoomIn} className={btn} aria-label="Zoom in"><ZoomIn className="h-5 w-5" /></button>
      <button onClick={onZoomOut} className={btn} aria-label="Zoom out"><ZoomOut className="h-5 w-5" /></button>
      <button onClick={onCenterBase} className={btn} aria-label="Centra base"><Crosshair className="h-5 w-5" /></button>
      <button onClick={onReset} className={btn} aria-label="Reset"><Maximize2 className="h-5 w-5" /></button>
      <span className="text-[10px] text-center text-muted-foreground font-mono bg-black/40 rounded px-1">{Math.round(scale * 100)}%</span>
    </div>
  );
}
