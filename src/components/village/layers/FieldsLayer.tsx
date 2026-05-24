import type { BaseBuilding } from "@/lib/base";
import { pctToWorld } from "@/lib/village/mapProjection";

interface Props { buildings: BaseBuilding[]; }

/** Piccoli campi/orti attorno a serre/depositi. */
export function FieldsLayer({ buildings }: Props) {
  const farms = buildings.filter(
    (b) => b.status === "idle" && /serra|orto|farm|deposito/i.test(b.type),
  );
  if (!farms.length) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {farms.map((b) => {
        const p = pctToWorld(b.position_x, b.position_y);
        return (
          <div
            key={b.id}
            className="absolute rounded-2xl"
            style={{
              left: p.x - 70, top: p.y - 10,
              width: 140, height: 60,
              background:
                "repeating-linear-gradient(45deg, #6a8f3d 0 10px, #547730 10px 20px)",
              opacity: 0.55,
              border: "2px solid #3f5a26",
            }}
          />
        );
      })}
    </div>
  );
}
