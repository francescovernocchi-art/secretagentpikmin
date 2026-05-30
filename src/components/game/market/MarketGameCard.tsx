import type { ReactNode } from "react";
import { ResourceIconSvg } from "@/components/game/assets/GameIcons";
import { rarityColor } from "@/data/artDirection";

export interface MarketCardRarity {
  label: string;
  level: number;
}

interface MarketGameCardProps {
  emoji: string;
  name: string;
  rarity: MarketCardRarity;
  subtitle?: string;
  value?: ReactNode;
  footer?: ReactNode;
  iconKind?: "berry" | "crystal";
  badge?: ReactNode;
  className?: string;
}

export function MarketGameCard({
  emoji,
  name,
  rarity,
  subtitle,
  value,
  footer,
  iconKind = "berry",
  badge,
  className = "",
}: MarketGameCardProps) {
  return (
    <div
      className={`market-card p-3 ${className}`}
      style={{ ["--card-rarity" as string]: rarityColor(rarity.level) }}
    >
      <div className="flex items-center gap-3">
        <div className="market-card-icon">
          <ResourceIconSvg kind={iconKind} size={32} />
          <span className="market-card-emoji" aria-hidden>{emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{name}</p>
            {badge}
          </div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: rarityColor(rarity.level) }}>
            {rarity.label}
          </p>
          {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {value && <div className="text-right shrink-0">{value}</div>}
      </div>
      {footer && <div className="mt-3 pt-2 border-t border-border/30">{footer}</div>}
    </div>
  );
}

export function rarityFromString(rarity: string): MarketCardRarity {
  const r = rarity.toLowerCase();
  if (r.includes("epic") || r.includes("epico")) return { label: "Epico", level: 4 };
  if (r.includes("rar")) return { label: "Raro", level: 3 };
  if (r.includes("inusual") || r.includes("uncommon")) return { label: "Inusuale", level: 2 };
  return { label: "Comune", level: 1 };
}
