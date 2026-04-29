import { useEffect, useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Plus, Trash2, Pencil, CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Task, TaskItem } from "@/types/task";
import { useCatalogs } from "@/hooks/use-catalogs";
import { useAdmin } from "@/hooks/use-admin";
import { CaliberPicker } from "./CaliberPicker";
import { VarietyPicker } from "./VarietyPicker";

type TaskDraft = Omit<Task, "id" | "status" | "createdAt">;

interface CreateProps {
  mode?: "create";
  defaultDate?: string;
  onCreate: (task: TaskDraft) => void;
}

interface EditProps {
  mode: "edit";
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, data: TaskDraft) => void;
}

type TaskDialogProps = CreateProps | EditProps;

type DraftItem = {
  id: string;
  sorts: string[];
  caliberMin: number;
  caliberMax: number;
  container: string;
  palletType: string;
  pallets: number | "";
  boxesPerPallet: number | "";
  boxWeight: number | "";
  notes: string;
  pricePerKg: number | "";
};

const DEFAULT_CAL_MIN = 55;
const DEFAULT_CAL_MAX = 100;

const emptyItem = (): DraftItem => ({
  id: crypto.randomUUID(),
  sorts: [],
  caliberMin: DEFAULT_CAL_MIN,
  caliberMax: DEFAULT_CAL_MAX,
  container: "",
  palletType: "",
  pallets: "",
  boxesPerPallet: "",
  boxWeight: "",
  notes: "",
  pricePerKg: "",
});

const itemToDraft = (it: TaskItem): DraftItem => ({
  id: it.id,
  sorts: Array.isArray((it as any).sorts)
    ? (it as any).sorts
    : (it as any).sort
      ? [(it as any).sort]
      : [],
  caliberMin: typeof it.caliberMin === "number" ? it.caliberMin : DEFAULT_CAL_MIN,
  caliberMax: typeof it.caliberMax === "number" ? it.caliberMax : DEFAULT_CAL_MAX,
  container: it.container,
  palletType: it.palletType ?? "",
  pallets: it.pallets || "",
  boxesPerPallet: it.boxesPerPallet || "",
  boxWeight: it.boxWeight || "",
  notes: it.notes ?? "",
  pricePerKg: typeof it.pricePerKg === "number" ? it.pricePerKg : "",
});

const todayISO = () => format(new Date(), "yyyy-MM-dd");

export const TaskDialog = (props: TaskDialogProps) => {
  const isEdit = props.mode === "edit";
  const { containers, pallets: palletTypes, counterparties, addCounterparty, getCounterpartyCurrency } = useCatalogs();
  const { isAdmin } = useAdmin();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isEdit ? props.open : internalOpen;
  const setOpen = isEdit ? props.onOpenChange : setInternalOpen;

  const [counterparty, setCounterparty] = useState("");
  const [dueDate, setDueDate] = useState<string>(todayISO());
  const [truckPlate, setTruckPlate] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setCounterparty(props.task.counterparty);
      setDueDate(props.task.dueDate || todayISO());
      setTruckPlate(props.task.truckPlate ?? "");
      const drafts = props.task.items.map(itemToDraft);
      setItems(drafts);
      // В режиме редактирования по умолчанию сворачиваем все, кроме последней
      const col: Record<string, boolean> = {};
      drafts.forEach((d, i) => {
        if (i !== drafts.length - 1) col[d.id] = true;
      });
      setCollapsed(col);
    } else {
      setCounterparty("");
      setDueDate(props.defaultDate || todayISO());
      setTruckPlate("");
      setItems([emptyItem()]);
      setCollapsed({});
    }
  }, [open, isEdit, isEdit ? props.task : null, !isEdit ? props.defaultDate : null]);

  const updateItem = (id: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
    setCollapsed((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: TaskItem[] = items
      .filter((it) => it.sorts.length > 0)
      .map((it) => ({
        id: it.id,
        sorts: it.sorts,
        caliberMin: it.caliberMin,
        caliberMax: it.caliberMax,
        container: it.container.trim(),
        palletType: it.palletType.trim(),
        pallets: Number(it.pallets) || 0,
        boxesPerPallet: Number(it.boxesPerPallet) || 0,
        boxWeight: Number(it.boxWeight) || 0,
        readyPallets: isEdit
          ? Math.min(
              Number(it.pallets) || 0,
              props.task.items.find((x) => x.id === it.id)?.readyPallets ?? 0
            )
          : 0,
        notes: it.notes.trim() || undefined,
        pricePerKg:
          it.pricePerKg === "" || !Number.isFinite(Number(it.pricePerKg))
            ? undefined
            : Number(it.pricePerKg),
      }));
    const cp = counterparty.trim();
    if (!cp || cleaned.length === 0) return;
    // Авто-добавление в словарь, если контрагент новый
    if (!counterparties.some((c) => c.name.toLowerCase() === cp.toLowerCase())) {
      addCounterparty(cp);
    }
    const data: TaskDraft = {
      counterparty: cp,
      items: cleaned,
      dueDate,
      truckPlate: truckPlate.trim() || undefined,
    };
    if (isEdit) {
      props.onSave(props.task.id, data);
    } else {
      props.onCreate(data);
    }
    setOpen(false);
  };

  const dateObj = dueDate ? new Date(dueDate + "T00:00:00") : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2 shadow-md">
            <Plus className="h-4 w-4" /> Nowe zadanie
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-4 w-4" /> : null}
            {isEdit ? "Edytuj zadanie" : "Nowe zadanie"}
          </DialogTitle>
          <DialogDescription>
            Kontrahent, data oraz jedna lub więcej pozycji asortymentu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="counterparty">Kontrahent *</Label>
              {counterparties.length > 0 ? (
                <Select
                  value={counterparty || undefined}
                  onValueChange={(v) => setCounterparty(v)}
                >
                  <SelectTrigger id="counterparty">
                    <SelectValue placeholder="Wybierz kontrahenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {counterparties.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                        <span className="ml-2 text-xs text-muted-foreground">{c.currency}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="counterparty"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="Np. Sp. z o.o. Rumianek (dodaj w Słownikach)"
                  required
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label>Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateObj && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateObj ? format(dateObj, "dd.MM.yyyy", { locale: pl }) : "Wybierz datę"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateObj}
                    onSelect={(d) => d && setDueDate(format(d, "yyyy-MM-dd"))}
                    weekStartsOn={1}
                    locale={pl}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="truck-plate">Nr auta</Label>
            <Input
              id="truck-plate"
              value={truckPlate}
              onChange={(e) => setTruckPlate(e.target.value.toUpperCase())}
              placeholder="np. WX 12345"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Pozycje ({items.length})</Label>
            <div className="flex items-center gap-2">
              {items.length > 1 && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setCollapsed(Object.fromEntries(items.map((it) => [it.id, true])))
                    }
                    className="h-7 px-2 text-xs"
                  >
                    Zwiń wszystkie
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setCollapsed({})}
                    className="h-7 px-2 text-xs"
                  >
                    Rozwiń
                  </Button>
                </>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const newItem = emptyItem();
                  setItems((prev) => {
                    // Сворачиваем все существующие при добавлении новой
                    setCollapsed(
                      Object.fromEntries(prev.map((it) => [it.id, true]))
                    );
                    return [...prev, newItem];
                  });
                }}
                className="gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Dodaj pozycję
              </Button>
            </div>
          </div>

          <ScrollArea className="-mx-1 max-h-[50vh] flex-1 px-1">
            <div className="space-y-3 pr-2">
              {items.map((it, idx) => {
                const isCollapsed = !!collapsed[it.id];
                const sortsText = it.sorts.join(", ") || "—";
                const calText =
                  typeof it.caliberMin === "number" && typeof it.caliberMax === "number"
                    ? `${it.caliberMin}–${it.caliberMax} mm`
                    : "";
                const palText = it.pallets ? `${it.pallets} pal.` : "";
                return (
                  <div
                    key={it.id}
                    className="space-y-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(it.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="text-xs font-medium text-muted-foreground">
                          #{idx + 1}
                        </span>
                        {isCollapsed && (
                          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                            <span className="truncate font-medium">{sortsText}</span>
                            {calText && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary tabular-nums">
                                {calText}
                              </span>
                            )}
                            {palText && (
                              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                {palText}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeItem(it.id)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>

                    {!isCollapsed && (
                      <>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor={`sort-${it.id}`}>Odmiana *</Label>
                      <VarietyPicker
                        id={`sort-${it.id}`}
                        value={it.sorts}
                        onChange={(next) => updateItem(it.id, { sorts: next })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`calibers-${it.id}`}>Kaliber, mm</Label>
                      <CaliberPicker
                        id={`calibers-${it.id}`}
                        min={it.caliberMin}
                        max={it.caliberMax}
                        onChange={(next) =>
                          updateItem(it.id, {
                            caliberMin: next.min,
                            caliberMax: next.max,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor={`container-${it.id}`}>Opakowanie</Label>
                      <Select
                        value={it.container || undefined}
                        onValueChange={(v) => updateItem(it.id, { container: v })}
                      >
                        <SelectTrigger id={`container-${it.id}`}>
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                        <SelectContent>
                          {containers.map((c) => (
                            <SelectItem key={c.name} value={c.name}>
                              {c.name}
                              {c.weight > 0 && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {c.weight} kg
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`pallet-type-${it.id}`}>Rodzaj palety</Label>
                      <Select
                        value={it.palletType || undefined}
                        onValueChange={(v) => updateItem(it.id, { palletType: v })}
                      >
                        <SelectTrigger id={`pallet-type-${it.id}`}>
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                        <SelectContent>
                          {palletTypes.map((p) => (
                            <SelectItem key={p.name} value={p.name}>
                              {p.name}
                              {p.weight > 0 && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {p.weight} kg
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor={`pallets-${it.id}`}>Palety</Label>
                      <Input
                        id={`pallets-${it.id}`}
                        type="number"
                        min={0}
                        value={it.pallets}
                        onChange={(e) =>
                          updateItem(it.id, {
                            pallets: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`boxes-${it.id}`}>Op./paleta</Label>
                      <Input
                        id={`boxes-${it.id}`}
                        type="number"
                        min={0}
                        value={it.boxesPerPallet}
                        onChange={(e) =>
                          updateItem(it.id, {
                            boxesPerPallet:
                              e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`weight-${it.id}`}>Waga op., kg</Label>
                      <Input
                        id={`weight-${it.id}`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.boxWeight}
                        onChange={(e) =>
                          updateItem(it.id, {
                            boxWeight:
                              e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  {isAdmin && (() => {
                    const pallets = Number(it.pallets) || 0;
                    const bpp = Number(it.boxesPerPallet) || 0;
                    const bw = Number(it.boxWeight) || 0;
                    const price = Number(it.pricePerKg) || 0;
                    const net = pallets * bpp * bw;
                    const sum = net * price;
                    const cur = counterparty ? getCounterpartyCurrency(counterparty) : "PLN";
                    return (
                      <div className="grid gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
                        <Label htmlFor={`price-${it.id}`} className="text-xs">
                          Cena za kg netto ({cur}) — tylko admin
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id={`price-${it.id}`}
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.pricePerKg}
                            onChange={(e) =>
                              updateItem(it.id, {
                                pricePerKg:
                                  e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            placeholder="0.00"
                            className="w-32"
                          />
                          <span className="text-xs text-muted-foreground">
                            × {net.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} kg ={" "}
                            <span className="font-semibold text-foreground">
                              {sum.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} {cur}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="grid gap-2">
                    <Label htmlFor={`notes-${it.id}`}>Uwagi</Label>
                    <Textarea
                      id={`notes-${it.id}`}
                      value={it.notes}
                      onChange={(e) => updateItem(it.id, { notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="submit">{isEdit ? "Zapisz" : "Dodaj zadanie"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
