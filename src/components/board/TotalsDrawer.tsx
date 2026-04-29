import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calculator } from "lucide-react";
import { Task } from "@/types/task";
import { useCatalogs } from "@/hooks/use-catalogs";

interface TotalsDrawerProps {
  tasks: Task[];
  rangeLabel: string;
}

const fmt = (n: number) =>
  n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });

interface Bucket {
  min: number;
  max: number;
  pallets: number;
  boxes: number;
  net: number;
  gross: number;
}

interface Row {
  variety: string;
  caliber: string;
  pallets: number;
  boxes: number;
  net: number;
  gross: number;
}

const NO_CALIBER = Number.NEGATIVE_INFINITY;

/** Łączy zachodzące lub stykające się przedziały kalibrów (krok 5 mm) dla jednej odmiany. */
const mergeBuckets = (buckets: Bucket[]): Bucket[] => {
  if (buckets.length === 0) return [];
  // Pozycje bez kalibru zostawiamy osobno
  const noCal = buckets.filter((b) => b.min === NO_CALIBER);
  const withCal = buckets
    .filter((b) => b.min !== NO_CALIBER)
    .sort((a, b) => a.min - b.min || a.max - b.max);

  const merged: Bucket[] = [];
  for (const b of withCal) {
    const last = merged[merged.length - 1];
    // Łączymy tylko gdy realnie się zachodzą (wspólny zakres > 0),
    // samo zetknięcie końcami (np. 60-65 i 65-70) NIE łączy
    if (last && b.min < last.max) {
      last.max = Math.max(last.max, b.max);
      last.pallets += b.pallets;
      last.boxes += b.boxes;
      last.net += b.net;
      last.gross += b.gross;
    } else {
      merged.push({ ...b });
    }
  }
  return [...merged, ...noCal];
};

const fmtBucket = (b: Bucket) =>
  b.min === NO_CALIBER ? "—" : `${b.min}–${b.max} mm`;

export const TotalsDrawer = ({ tasks, rangeLabel }: TotalsDrawerProps) => {
  const { getContainerWeight, getPalletWeight } = useCatalogs();
  const [open, setOpen] = useState(false);

  const { rows, totals } = useMemo(() => {
    // variety -> lista kubełków (jeden na pozycję)
    const byVariety = new Map<string, Bucket[]>();
    let tPallets = 0;
    let tBoxes = 0;
    let tNet = 0;
    let tGross = 0;

    for (const t of tasks) {
      for (const it of t.items) {
        const sorts = it.sorts && it.sorts.length > 0 ? it.sorts : ["—"];
        const boxes = it.pallets * it.boxesPerPallet;
        const containerW = getContainerWeight(it.container);
        const palletW = getPalletWeight(it.palletType);
        const net = boxes * it.boxWeight;
        const gross = boxes * (it.boxWeight + containerW) + it.pallets * palletW;

        const hasCal =
          typeof it.caliberMin === "number" && typeof it.caliberMax === "number";
        const bMin = hasCal ? (it.caliberMin as number) : NO_CALIBER;
        const bMax = hasCal ? (it.caliberMax as number) : NO_CALIBER;

        // Dziel proporcjonalnie po liczbie odmian w pozycji
        const share = 1 / sorts.length;
        for (const v of sorts) {
          const list = byVariety.get(v) ?? [];
          list.push({
            min: bMin,
            max: bMax,
            pallets: it.pallets * share,
            boxes: boxes * share,
            net: net * share,
            gross: gross * share,
          });
          byVariety.set(v, list);
        }
        tPallets += it.pallets;
        tBoxes += boxes;
        tNet += net;
        tGross += gross;
      }
    }

    const rows: Row[] = [];
    for (const [variety, buckets] of byVariety) {
      const merged = mergeBuckets(buckets);
      for (const b of merged) {
        rows.push({
          variety,
          caliber: fmtBucket(b),
          pallets: b.pallets,
          boxes: b.boxes,
          net: b.net,
          gross: b.gross,
        });
      }
    }
    rows.sort(
      (a, b) =>
        a.variety.localeCompare(b.variety, "pl") ||
        a.caliber.localeCompare(b.caliber)
    );
    return {
      rows,
      totals: { pallets: tPallets, boxes: tBoxes, net: tNet, gross: tGross },
    };
  }, [tasks, getContainerWeight, getPalletWeight]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calculator className="h-4 w-4" />
          Sumy
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
            {fmt(totals.gross)} kg
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-6 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Sumy wagi
          </SheetTitle>
          <SheetDescription>{rangeLabel}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {rows.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Brak zadań w wybranym zakresie
              </div>
            ) : (
              rows.map((r) => (
                <div
                  key={`${r.variety}-${r.caliber}`}
                  className="space-y-1.5 rounded-md border bg-muted/20 p-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-medium">{r.variety}</div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary tabular-nums">
                      {r.caliber}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Palety</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {fmt(r.pallets)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Op.</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {fmt(r.boxes)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Netto</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {fmt(r.net)} kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Brutto</span>
                      <span className="font-semibold text-foreground tabular-nums">
                        {fmt(r.gross)} kg
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="space-y-1 border-t bg-card/50 p-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Razem palety / op.</span>
            <span className="font-medium tabular-nums text-foreground">
              {fmt(totals.pallets)} / {fmt(totals.boxes)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Netto</span>
            <span className="font-semibold tabular-nums">{fmt(totals.net)} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Brutto</span>
            <span className="text-base font-bold tabular-nums text-primary">
              {fmt(totals.gross)} kg
            </span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
