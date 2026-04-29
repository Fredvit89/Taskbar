import { useMemo, useState } from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, Printer, X } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";
import { TaskCard } from "./TaskCard";
import { TaskDialog } from "./TaskDialog";
import { TotalsDrawer } from "./TotalsDrawer";
import { useAdmin } from "@/hooks/use-admin";
import { useCatalogs } from "@/hooks/use-catalogs";
import { printTasks } from "@/lib/print-tasks";

export type ViewMode = "1" | "5" | "7" | "month";

interface CalendarBoardProps {
  tasks: Task[];
  onCreate: (data: Omit<Task, "id" | "status" | "createdAt">) => void;
  onDelete: (id: string) => void;
  onUpdateReady: (taskId: string, itemId: string, delta: number) => void;
  onEdit: (taskId: string, data: Omit<Task, "id" | "status" | "createdAt">) => void;
  onResetReady: (taskId: string) => void;
  onMoveDate: (taskId: string, newDate: string) => void;
}

const toISO = (d: Date) => format(d, "yyyy-MM-dd");

const DayDropZone = ({
  iso,
  isOver: _isOver,
  children,
  className,
}: {
  iso: string;
  isOver?: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${iso}`, data: { iso } });
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "ring-2 ring-primary bg-primary/5")}
    >
      {children}
    </div>
  );
};

export const CalendarBoard = ({
  tasks,
  onCreate,
  onDelete,
  onUpdateReady,
  onEdit,
  onResetReady,
  onMoveDate,
}: CalendarBoardProps) => {
  const { canEdit, canSeePrices } = useAdmin();
  const { getContainerWeight, getPalletWeight, getCounterpartyCurrency } = useCatalogs();
  const [view, setView] = useState<ViewMode>("5");
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const clearSelection = () => setSelected(new Set());

  const handlePrint = () => {
    const chosen = tasks.filter((t) => selected.has(t.id));
    if (chosen.length === 0) return;
    printTasks(chosen, {
      getContainerWeight,
      getPalletWeight,
      getCounterpartyCurrency,
      isAdmin: canSeePrices,
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (!canEdit) return;
    const taskId = e.active.id as string;
    const overId = e.over?.id as string | undefined;
    if (!overId || !overId.startsWith("day-")) return;
    const iso = overId.slice(4);
    onMoveDate(taskId, iso);
  };

  const days = useMemo(() => {
    if (view === "1") return [anchor];
    if (view === "month") {
      const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
      const out: Date[] = [];
      let d = start;
      while (d <= end) {
        out.push(d);
        d = addDays(d, 1);
      }
      return out;
    }
    const count = view === "5" ? 5 : 7;
    return Array.from({ length: count }, (_, i) => addDays(anchor, i));
  }, [anchor, view]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const key = t.dueDate || toISO(new Date(t.createdAt));
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const tasksInRange = useMemo(() => {
    const set = new Set(days.map(toISO));
    return tasks.filter((t) => set.has(t.dueDate || toISO(new Date(t.createdAt))));
  }, [tasks, days]);

  const shift = (delta: number) => {
    if (view === "month") {
      setAnchor((d) => addMonths(d, delta));
    } else {
      setAnchor((d) => addDays(d, delta));
    }
  };

  const rangeLabel =
    view === "month"
      ? format(anchor, "LLLL yyyy", { locale: pl })
      : days.length === 1
      ? format(days[0], "d MMMM yyyy", { locale: pl })
      : `${format(days[0], "d MMM", { locale: pl })} – ${format(
          days[days.length - 1],
          "d MMM yyyy",
          { locale: pl }
        )}`;

  const gridCols =
    view === "1"
      ? "grid-cols-1"
      : view === "5"
      ? "md:grid-cols-5"
      : "md:grid-cols-7";
  const isMonth = view === "month";

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/60 p-3 backdrop-blur">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())}>
            Dzisiaj
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2 gap-2">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">{rangeLabel}</span>
                <span className="sm:hidden">{format(anchor, "d MMM", { locale: pl })}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={anchor}
                onSelect={(d) => {
                  if (d) {
                    setAnchor(d);
                    setPickerOpen(false);
                  }
                }}
                weekStartsOn={1}
                locale={pl}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <Button size="sm" variant="default" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Drukuj ({selected.size})
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection} className="gap-1">
                <X className="h-4 w-4" />
                Wyczyść
              </Button>
            </>
          )}
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="1">1 dzień</TabsTrigger>
              <TabsTrigger value="5">5 dni</TabsTrigger>
              <TabsTrigger value="7">7 dni</TabsTrigger>
              <TabsTrigger value="month">Miesiąc</TabsTrigger>
            </TabsList>
          </Tabs>
          <TotalsDrawer tasks={tasksInRange} rangeLabel={rangeLabel} />
        </div>
      </div>

      {isMonth && (
        <div className="grid grid-cols-7 gap-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
            <div key={d} className="px-1 py-0.5">{d}</div>
          ))}
        </div>
      )}
      <div className={cn("grid gap-3 grid-cols-1", isMonth ? "grid-cols-7 gap-1" : gridCols)}>
        {days.map((day) => {
          const iso = toISO(day);
          const dayTasks = tasksByDay.get(iso) ?? [];
          const today = isToday(day);
          const inMonth = isMonth ? isSameMonth(day, anchor) : true;
          if (isMonth) {
            return (
              <DayDropZone
                key={iso}
                iso={iso}
                className={cn(
                  "flex min-h-[110px] flex-col rounded-md border bg-card/50 p-1.5 transition-colors",
                  today && "ring-2 ring-primary/40",
                  !inMonth && "opacity-40"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-semibold leading-none",
                      today && "text-primary"
                    )}
                  >
                    {format(day, "d", { locale: pl })}
                  </span>
                  <div className="flex items-center gap-1">
                    {dayTasks.length > 0 && (
                      <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                        {dayTasks.length}
                      </span>
                    )}
                    {canEdit && <TaskDialog onCreate={onCreate} defaultDate={iso} />}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                  {dayTasks.slice(0, 4).map((t) => {
                    const totalP = t.items.reduce((s, i) => s + i.pallets, 0);
                    const readyP = t.items.reduce((s, i) => s + (i.readyPallets ?? 0), 0);
                    const done = totalP > 0 && readyP >= totalP;
                    return (
                      <Popover key={t.id}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "flex items-center justify-between gap-1 rounded border px-1 py-0.5 text-left text-[10px] leading-tight transition-colors hover:bg-accent",
                              selected.has(t.id)
                                ? "border-primary bg-primary/10"
                                : "bg-background",
                              done && "border-[hsl(var(--status-done))]"
                            )}
                            title={`${t.counterparty} · ${readyP}/${totalP} palet`}
                          >
                            <span className="truncate font-medium">{t.counterparty}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {readyP}/{totalP}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <TaskCard
                            task={t}
                            onDelete={onDelete}
                            onUpdateReady={onUpdateReady}
                            onEdit={onEdit}
                            onResetReady={onResetReady}
                            selected={selected.has(t.id)}
                            onToggleSelected={toggleSelected}
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                  {dayTasks.length > 4 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{dayTasks.length - 4} więcej
                    </span>
                  )}
                </div>
              </DayDropZone>
            );
          }
          return (
            <DayDropZone
              key={iso}
              iso={iso}
              className={cn(
                "flex flex-col rounded-xl border bg-card/50 p-3 backdrop-blur transition-colors h-[calc(100vh-220px)]",
                today && "ring-2 ring-primary/40"
              )}
            >
              <div className="mb-3 flex shrink-0 items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {format(day, "EEEE", { locale: pl })}
                  </div>
                  <div
                    className={cn(
                      "text-lg font-semibold leading-tight",
                      today && "text-primary"
                    )}
                  >
                    {format(day, "d MMM", { locale: pl })}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {dayTasks.length}
                  </span>
                  {canEdit && (
                    <TaskDialog onCreate={onCreate} defaultDate={iso} />
                  )}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                {dayTasks.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 py-8 text-xs text-muted-foreground">
                    Brak zadań
                  </div>
                ) : (
                  dayTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onDelete={onDelete}
                      onUpdateReady={onUpdateReady}
                      onEdit={onEdit}
                      onResetReady={onResetReady}
                      selected={selected.has(t.id)}
                      onToggleSelected={toggleSelected}
                    />
                  ))
                )}
              </div>
            </DayDropZone>
          );
        })}
      </div>
      </div>
    </DndContext>
  );
};

export { parseISO };
