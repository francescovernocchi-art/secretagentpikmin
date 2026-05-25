import { useState } from "react";
import { ImageIcon, MapPin, Building2, Palette, Sparkles, Layers } from "lucide-react";

export type EditorTab = "diorama" | "slots" | "structures" | "variants" | "bonus" | "events";

interface TabDef {
  key: EditorTab;
  label: string;
  icon: typeof ImageIcon;
}

const TABS: TabDef[] = [
  { key: "diorama", label: "Diorama", icon: ImageIcon },
  { key: "slots", label: "Slot", icon: MapPin },
  { key: "structures", label: "Strutture", icon: Building2 },
  { key: "variants", label: "Varianti", icon: Layers },
  { key: "bonus", label: "Bonus", icon: Sparkles },
  { key: "events", label: "Eventi", icon: Palette },
];

interface Props {
  active: EditorTab;
  onChange: (t: EditorTab) => void;
}

export function BiomeEditorTabs({ active, onChange }: Props) {
  return (
    <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-md border-b border-border/40">
      <div className="flex gap-1.5 overflow-x-auto overscroll-contain [-webkit-overflow-scrolling:touch] no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.key === active;
          return (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs min-h-[40px] transition border ${
                on
                  ? "bg-primary/25 border-primary text-primary"
                  : "bg-card/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function useBiomeEditorTab(initial: EditorTab = "diorama") {
  return useState<EditorTab>(initial);
}
