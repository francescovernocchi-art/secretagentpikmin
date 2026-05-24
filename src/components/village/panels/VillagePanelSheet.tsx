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
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-primary/30 !z-[100] !bg-background/98 backdrop-blur-2xl shadow-[0_-12px_40px_rgba(0,0,0,0.6)]"
        style={{
          backgroundColor: "oklch(0.16 0.04 250 / 0.98)",
          backgroundImage:
            "linear-gradient(180deg, oklch(0.20 0.05 250 / 0.98), oklch(0.14 0.04 250 / 0.98))",
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-3 pb-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
