import { useEffect, useRef, useState } from "react";

interface Props {
  assetUrl: string | null;
  shadowUrl?: string | null;
  glowUrl?: string | null;
  slotFitScale: number;
  anchorX: number;
  anchorY: number;
  offsetX: number;
  offsetY: number;
  dioramaUrl?: string | null;
  /** dimensione virtuale slot (default 96x96 = identica al default slot). */
  slotW?: number;
  slotH?: number;
}

/** Preview live: edificio dentro un finto slot sopra il diorama del bioma. */
export function StructurePreview({
  assetUrl,
  shadowUrl,
  glowUrl,
  slotFitScale,
  anchorX,
  anchorY,
  offsetX,
  offsetY,
  dioramaUrl,
  slotW = 96,
  slotH = 96,
}: Props) {
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!assetUrl) {
      setImgSize(null);
      return;
    }
    const img = new Image();
    img.onload = () => setImgSize({ w: img.width || 1, h: img.height || 1 });
    img.src = assetUrl;
  }, [assetUrl]);

  // Stage = 240x240 px. Lo slot occupa 60% del canvas, centrato.
  const STAGE = 240;
  const slotPx = STAGE * 0.6;
  const slotScale = slotPx / Math.max(slotW, slotH);
  const slotDrawW = slotW * slotScale;
  const slotDrawH = slotH * slotScale;
  const slotLeft = (STAGE - slotDrawW) / 2;
  const slotTop = (STAGE - slotDrawH) / 2;

  // Fit dell'asset dentro lo slot
  const fit = imgSize
    ? Math.min(slotDrawW / imgSize.w, slotDrawH / imgSize.h) * slotFitScale
    : 1;
  const assetW = imgSize ? imgSize.w * fit : 0;
  const assetH = imgSize ? imgSize.h * fit : 0;

  // Anchor point sullo slot
  const anchorPxX = slotLeft + anchorX * slotDrawW + offsetX * slotScale;
  const anchorPxY = slotTop + anchorY * slotDrawH + offsetY * slotScale;
  const assetLeft = anchorPxX - assetW * anchorX;
  const assetTop = anchorPxY - assetH * anchorY;

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-lg border border-primary/30 bg-black/40"
      style={{
        width: STAGE,
        height: STAGE,
        backgroundImage: dioramaUrl ? `url(${dioramaUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Slot outline */}
      <div
        className="absolute border-2 border-dashed border-primary/80 rounded-md pointer-events-none"
        style={{
          left: slotLeft,
          top: slotTop,
          width: slotDrawW,
          height: slotDrawH,
          boxShadow: "0 0 14px rgba(124,217,154,0.5) inset",
        }}
      />
      {/* Shadow asset */}
      {shadowUrl && imgSize && (
        <img
          src={shadowUrl}
          alt=""
          className="absolute pointer-events-none opacity-60"
          style={{
            left: assetLeft - 2,
            top: assetTop + 4,
            width: assetW + 4,
            height: assetH,
          }}
        />
      )}
      {/* Main asset */}
      {assetUrl && imgSize && (
        <img
          ref={imgRef}
          src={assetUrl}
          alt="struttura"
          className="absolute pointer-events-none"
          style={{ left: assetLeft, top: assetTop, width: assetW, height: assetH }}
        />
      )}
      {/* Glow */}
      {glowUrl && imgSize && (
        <img
          src={glowUrl}
          alt=""
          className="absolute pointer-events-none mix-blend-screen opacity-80"
          style={{ left: assetLeft, top: assetTop, width: assetW, height: assetH }}
        />
      )}
      {/* Anchor dot */}
      <div
        className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 ring-2 ring-amber-200 pointer-events-none"
        style={{ left: anchorPxX, top: anchorPxY }}
      />
      {!assetUrl && (
        <div className="absolute inset-0 grid place-items-center text-[10px] text-muted-foreground">
          carica un PNG per vedere la preview
        </div>
      )}
    </div>
  );
}
