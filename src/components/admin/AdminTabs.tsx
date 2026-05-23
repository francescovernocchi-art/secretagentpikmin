import { useState, type ReactNode } from "react";

export interface TabDef {
  key: string;
  label: string;
  icon?: string;
  render: () => ReactNode;
}

export function AdminTabs({ tabs, initial }: { tabs: TabDef[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition ${
              active === t.key ? "bg-primary text-primary-foreground" : "panel"
            }`}
          >
            {t.icon && <span className="mr-1">{t.icon}</span>}
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.render()}</div>
    </div>
  );
}
