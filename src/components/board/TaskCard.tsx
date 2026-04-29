import { useState } from "react";
import { Trash2, Package, Boxes, Layers, Building2, Minus, Plus, Weight, Pencil, RotateCcw, Truck } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Task } from "@/types/task";
import { useAdmin } from "@/hooks/use-admin";
import { useCatalogs } from "@/hooks/use-catalogs";
import { TaskDialog } from "./TaskDialog";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onUpdateReady: (taskId: string, itemId: string, delta: number) => void;
  onEdit: (taskId: string, data: Omit<Task, "id" | "status" | "createdAt">) => void;
  onResetReady: (taskId: string) => void;
  selected?: boolean;
  onToggleSelected?: (id: string) => void;
}

const fmt = (n: number) =>
  n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });

export const TaskCard = ({ task, onDelete, onUpdateReady, onEdit, onResetReady, selected, onToggleSelected }: TaskCardProps) => {
  const { canEdit, canSeePrices } = useAdmin();
  const { getContainerWeight, getPalletWeight, getCounterpartyCurrency } = useCatalogs();
  const currency = getCounterpartyCurrency(task.counterparty);
  const [editOpen, setEditOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canEdit,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const totalPallets = task.items.reduce((s, i) => s + i.pallets, 0);
  const totalBoxes = task.items.reduce(
    (s, i) => s + i.pallets * i.boxesPerPallet,
    0
  );
  const totalReady = task.items.reduce((s, i) => s + (i.readyPallets ?? 0), 0);
  const totalNet = task.items.reduce(
    (s, i) => s + i.pallets * i.boxesPerPallet * i.boxWeight,
    0
  );
  const totalGross = task.items.reduce((s, i) => {
    const boxes = i.pallets * i.boxesPerPallet;
    const containerW = getContainerWeight(i.container);
    const palletW = getPalletWeight(i.palletType);
    return s + boxes * (i.boxWeight + containerW) + i.pallets * palletW;
  }, 0);
  const totalSum = task.items.reduce((s, i) => {
    const net = i.pallets * i.boxesPerPallet * i.boxWeight;
    return s + net * (i.pricePerKg ?? 0);
  }, 0);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group transition-shadow hover:shadow-lg ${
        isDragging ? "z-50 opacity-60 shadow-2xl" : ""
      } ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <CardHeader
        {...(canEdit ? attributes : {})}
        {...(canEdit ? listeners : {})}
        className="flex flex-row items-start justify-between space-y-0 p-2.5 pb-1.5"
      >
        <div className="flex items-start gap-2">
          {onToggleSelected && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="pt-0.5"
            >
              <Checkbox
                checked={!!selected}
                onCheckedChange={() => onToggleSelected(task.id)}
                aria-label="Zaznacz do wydruku"
                className="h-4 w-4"
              />
            </div>
          )}
          <div className="space-y-1">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              {task.counterparty}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
              <span>
                {task.items.length} {task.items.length === 1 ? "pozycja" : "pozycji"}
              </span>
              {task.truckPlate && (
                <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono font-semibold uppercase text-foreground">
                  <Truck className="h-2.5 w-2.5" />
                  {task.truckPlate}
                </span>
              )}
            </div>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setEditOpen(true)}
              title="Edytuj"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onResetReady(task.id)}
              title="Resetuj postęp"
            >
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onDelete(task.id)}
              title="Usuń"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-1.5 p-2.5 pt-0">
        <div className="space-y-1.5">
          {task.items.map((item) => {
            const sub = item.pallets * item.boxesPerPallet;
            const ready = item.readyPallets ?? 0;
            const isDone = item.pallets > 0 && ready >= item.pallets;
            return (
              <div
                key={item.id}
                className="rounded-md border bg-muted/30 p-1.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-sm font-medium leading-tight">
                      {(item.sorts ?? []).join(", ") || "—"}
                    </span>
                    {(typeof item.caliberMin === "number" || typeof item.caliberMax === "number") && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-medium text-primary tabular-nums">
                        {item.caliberMin ?? "?"}–{item.caliberMax ?? "?"}
                      </span>
                    )}
                  </div>
                  {sub > 0 && (
                    <Badge variant="secondary" className="h-4 shrink-0 gap-0.5 px-1 text-[10px]">
                      <Boxes className="h-2.5 w-2.5" /> {sub}
                    </Badge>
                  )}
                </div>
                {(item.container || item.palletType) && (
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {[item.container, item.palletType].filter(Boolean).join(" · ")}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Layers className="h-2.5 w-2.5" />
                    <span className="font-medium text-foreground">{item.pallets}</span>p
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Package className="h-2.5 w-2.5" />
                    <span className="font-medium text-foreground">{item.boxesPerPallet}</span>/p
                  </span>
                  {item.boxWeight > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Weight className="h-2.5 w-2.5" />
                      <span className="font-medium text-foreground">{item.boxWeight}</span>kg
                    </span>
                  )}
                </div>

                <div
                  className={`mt-1 flex items-center justify-between rounded-md border px-1.5 py-0.5 ${
                    isDone ? "border-[hsl(var(--status-done))] bg-[hsl(var(--status-done)/0.1)]" : "bg-background"
                  }`}
                >
                  <span className="text-[10px] text-muted-foreground">Gotowe</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onUpdateReady(task.id, item.id, -1)}
                      disabled={ready <= 0}
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </Button>
                    <span className="min-w-[2.5rem] text-center text-xs font-semibold tabular-nums">
                      {ready}/{item.pallets}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onUpdateReady(task.id, item.id, 1)}
                      disabled={ready >= item.pallets}
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>

                {item.notes && (
                  <div className="mt-1 rounded-md border-l-2 border-primary/40 bg-background px-2 py-1 text-xs leading-snug text-foreground whitespace-pre-wrap break-words">
                    <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Uwagi:</span>
                    {item.notes}
                  </div>
                )}
                {canSeePrices && typeof item.pricePerKg === "number" && item.pricePerKg > 0 && (
                  <div className="mt-1 flex items-center justify-between rounded border border-amber-500/40 bg-amber-500/5 px-1.5 py-0.5 text-[10px]">
                    <span className="text-muted-foreground">
                      {fmt(item.pricePerKg)} {currency}/kg
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {fmt(item.pallets * item.boxesPerPallet * item.boxWeight * item.pricePerKg)} {currency}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(totalPallets > 0 || totalBoxes > 0) && (
          <div className="space-y-0.5 rounded-md bg-primary/5 px-2 py-1 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-muted-foreground">Razem</span>
              <span className="font-semibold tabular-nums">
                {totalReady}/{totalPallets} palet · {totalBoxes} op.
              </span>
            </div>
            {(totalNet > 0 || totalGross > 0) && (
              <div className="flex items-center justify-between border-t border-border/50 pt-0.5">
                <span className="text-muted-foreground">Netto / Brutto</span>
                <span className="font-semibold tabular-nums">
                  {fmt(totalNet)} / {fmt(totalGross)} kg
                </span>
              </div>
            )}
            {canSeePrices && totalSum > 0 && (
              <div className="flex items-center justify-between border-t border-amber-500/40 pt-0.5 text-amber-700 dark:text-amber-400">
                <span className="font-medium">Suma</span>
                <span className="font-bold tabular-nums">{fmt(totalSum)} {currency}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      {canEdit && (
        <TaskDialog
          mode="edit"
          task={task}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={onEdit}
        />
      )}
    </Card>
  );
};
