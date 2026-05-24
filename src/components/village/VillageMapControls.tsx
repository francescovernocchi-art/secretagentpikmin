import { ZoomIn, ZoomOut, Maximize2, Crosshair } from "lucide-react";

interface Props {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onCenterBase: () => void;
}

export function VillageMapControls({ scale, onZoomIn, onZoomOut, onReset, onCenterBase }: Props) {
  const btn = "panel-strong w-9 h-9 flex items-center justify-center active:scale-90 transition";
  return (
    <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5 pointer-events-auto">
      <button onClick={onZoomIn} className={btn} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
      <button onClick={onZoomOut} className={btn} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
      <button onClick={onCenterBase} className={btn} aria-label="Centra base"><Crosshair className="h-4 w-4" /></button>
      <button onClick={onReset} className={btn} aria-label="Reset"><Maximize2 className="h-4 w-4" /></button>
      <span className="text-[9px] text-center text-muted-foreground font-mono">{Math.round(scale * 100)}%</span>
    </div>
  );
}
