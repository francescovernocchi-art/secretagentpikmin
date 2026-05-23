import { Hammer, Sparkles, Map as MapIcon, Package, ShieldPlus, Palette } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { hapticTap } from "@/lib/haptic";

interface Props {
  onBuild: () => void;
  onWalls: () => void;
  onCustomize: () => void;
  mapHref?: string;
}

/** Azioni rapide: Costruisci, Mura, Estetica + link Mappa/Inventario. */
export function VillageActions({ onBuild, onWalls, onCustomize, mapHref = "/mappa" }: Props) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      <ActionBtn label="Costruisci" icon={<Hammer className="h-4 w-4" />} onClick={() => { hapticTap(); onBuild(); }} />
      <ActionBtn label="Mura" icon={<ShieldPlus className="h-4 w-4" />} onClick={() => { hapticTap(); onWalls(); }} />
      <ActionBtn label="Estetica" icon={<Palette className="h-4 w-4" />} onClick={() => { hapticTap(); onCustomize(); }} />
      <LinkBtn label="Pikmin" icon={<Sparkles className="h-4 w-4" />} to="/inventario" />
      <LinkBtn label="Mappa" icon={<MapIcon className="h-4 w-4" />} to={mapHref} />
    </div>
  );
}

function ActionBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="panel-strong p-2 flex flex-col items-center gap-0.5 active:scale-95 transition"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-[9px] uppercase tracking-wider">{label}</span>
    </button>
  );
}

function LinkBtn({ label, icon, to }: { label: string; icon: React.ReactNode; to: string }) {
  return (
    <Link
      to={to}
      onClick={hapticTap}
      className="panel-strong p-2 flex flex-col items-center gap-0.5 active:scale-95 transition"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-[9px] uppercase tracking-wider">{label}</span>
    </Link>
  );
}
