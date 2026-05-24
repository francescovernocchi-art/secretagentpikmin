import { worldToPct } from "@/lib/village/mapProjection";

interface Props {
  onTapEmpty?: (pos: { px: number; py: number }) => void;
}

/** Layer trasparente che cattura tap su tile vuoti (per piazzare nuovi edifici). */
export function InteractionLayer({ onTapEmpty }: Props) {
  if (!onTapEmpty) return null;
  return (
    <div
      className="absolute inset-0"
      onClick={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * r.width;
        const y = ((e.clientY - r.top) / r.height) * r.height;
        onTapEmpty(worldToPct(x, y));
      }}
    />
  );
}
