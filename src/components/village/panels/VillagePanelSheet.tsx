import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ReactNode } from "react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}

/** Wrapper standard per i pannelli del menu villaggio (slide dal basso, mobile-first). */
export function VillagePanelSheet({ open, onOpenChange, title, icon, children }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="
          flex flex-col
          max-h-[88dvh] h-[88dvh]
          rounded-t-3xl border-primary/30
          !z-[200]
          !bg-background/98 backdrop-blur-2xl
          shadow-[0_-12px_40px_rgba(0,0,0,0.6)]
          p-0
        "
        style={{
          backgroundColor: "oklch(0.16 0.04 250 / 0.98)",
          backgroundImage:
            "linear-gradient(180deg, oklch(0.20 0.05 250 / 0.98), oklch(0.14 0.04 250 / 0.98))",
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-border/30">
          <SheetTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </SheetTitle>
        </SheetHeader>
        <div
          className="
            flex-1 min-h-0
            overflow-y-auto overscroll-contain
            px-5 pt-4
            [-webkit-overflow-scrolling:touch]
          "
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
