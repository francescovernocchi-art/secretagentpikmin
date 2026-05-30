import { ShieldPlus } from "lucide-react";
import { VillagePanelSheet } from "./VillagePanelSheet";
import { WallEditor } from "../WallEditor";
import { wallDefenseBonus, type WallSegment } from "@/lib/village/walls";
import type { VillageStatus } from "@/lib/village/bonuses";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  agent: string;
  walls: WallSegment[];
  coins: number;
  status: VillageStatus;
  onRefresh: () => void;
}

export function DefensePanel({ open, onOpenChange, agent, walls, coins, status, onRefresh }: Props) {
  const wallBonus = wallDefenseBonus(walls);
  return (
    <VillagePanelSheet open={open} onOpenChange={onOpenChange}
      title="Difese" icon={<ShieldPlus className="h-4 w-4 text-emerald-400" />}>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Difesa" value={status.defenseRating} accent="#7cd99a" />
        <Stat label="Mura" value={walls.length} accent="#94a3b8" />
        <Stat label="Bonus mura" value={`+${wallBonus}`} accent="#67e8f9" />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Editor muri</p>
      <div className="rounded-xl overflow-hidden border border-primary/20">
        {/* WallEditor è un modal: lo rendiamo qui inline come strumento integrato */}
        <WallEditor agent={agent} walls={walls} coins={coins}
          onClose={() => onOpenChange(false)} onChange={onRefresh} />
      </div>
    </VillagePanelSheet>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="panel-strong p-2 text-center">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-lg font-display" style={{ color: accent }}>{value}</p>
    </div>
  );
}
