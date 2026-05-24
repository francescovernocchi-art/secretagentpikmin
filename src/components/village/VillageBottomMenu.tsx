import { Hammer, ShieldPlus, Sparkles, Palette, Users } from "lucide-react";
import { hapticTap } from "@/lib/haptic";

export type VillageMenuKey = "build" | "defense" | "bonus" | "aesthetic" | "pikmin";

interface Props {
  active: VillageMenuKey | null;
  onOpen: (k: VillageMenuKey) => void;
}

const ITEMS: { key: VillageMenuKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { key: "build",     label: "Costruzione", icon: Hammer,     color: "#f6ad55" },
  { key: "defense",   label: "Difese",      icon: ShieldPlus, color: "#7cd99a" },
  { key: "bonus",     label: "Bonus",       icon: Sparkles,   color: "#67e8f9" },
  { key: "aesthetic", label: "Estetica",    icon: Palette,    color: "#c084fc" },
  { key: "pikmin",    label: "Pikmin",      icon: Users,      color: "#ef476f" },
];

/** Menu fisso in basso, mobile-first. Apre i pannelli Sheet. */
export function VillageBottomMenu({ active, onOpen }: Props) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}
    >
      <div className="mx-auto max-w-md panel-strong px-2 py-2 shadow-2xl backdrop-blur-md">
        <ul className="grid grid-cols-5 gap-1">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            const isActive = active === it.key;
            return (
              <li key={it.key}>
                <button
                  onClick={() => { hapticTap(); onOpen(it.key); }}
                  className={`w-full min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${
                    isActive ? "bg-primary/20 ring-1 ring-primary/60" : "hover:bg-white/5"
                  }`}
                  aria-label={it.label}
                >
                  <Icon className="h-5 w-5" style={{ color: isActive ? it.color : "currentColor" }} />
                  <span className="text-[9px] uppercase tracking-wider leading-none">{it.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
