import { useState } from "react";
import { Database, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CatalogEntry, Counterparty, CURRENCIES, Currency, useCatalogs } from "@/hooks/use-catalogs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ListEditor = ({
  items,
  onAdd,
  onUpdate,
  onRemove,
  namePlaceholder,
  weightPlaceholder,
}: {
  items: CatalogEntry[];
  onAdd: (entry: CatalogEntry) => void;
  onUpdate: (name: string, patch: Partial<CatalogEntry>) => void;
  onRemove: (name: string) => void;
  namePlaceholder: string;
  weightPlaceholder: string;
}) => {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState<string>("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), weight: Number(weight) || 0 });
    setName("");
    setWeight("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          className="flex-1"
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={weightPlaceholder}
          className="w-24"
        />
        <Button type="submit" size="icon" className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
      <ScrollArea className="max-h-[40vh]">
        <ul className="space-y-1.5 pr-2">
          {items.length === 0 && (
          <li className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Lista pusta
            </li>
          )}
          {items.map((it) => (
            <li
              key={it.name}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="flex-1 truncate">{it.name}</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={it.weight}
                  onChange={(e) =>
                    onUpdate(it.name, { weight: Number(e.target.value) || 0 })
                  }
                  className="h-7 w-20 text-xs"
                />
                <span className="text-xs text-muted-foreground">кг</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRemove(it.name)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
};


const CounterpartyEditor = ({
  items,
  onAdd,
  onUpdateCurrency,
  onRemove,
}: {
  items: Counterparty[];
  onAdd: (name: string, currency: Currency) => void;
  onUpdateCurrency: (name: string, currency: Currency) => void;
  onRemove: (name: string) => void;
}) => {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("PLN");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), currency);
    setName("");
    setCurrency("PLN");
  };
  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Np. Sp. z o.o. Rumianek"
          className="flex-1"
        />
        <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="icon" className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
      <ScrollArea className="max-h-[40vh]">
        <ul className="space-y-1.5 pr-2">
          {items.length === 0 && (
            <li className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Lista pusta
            </li>
          )}
          {items.map((it) => (
            <li
              key={it.name}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="flex-1 truncate">{it.name}</span>
              <Select
                value={it.currency}
                onValueChange={(v) => onUpdateCurrency(it.name, v as Currency)}
              >
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRemove(it.name)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
};


export const CatalogsDialog = () => {
  const [open, setOpen] = useState(false);
  const cat = useCatalogs();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Database className="h-4 w-4" />
          Słowniki
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Słowniki</DialogTitle>
          <DialogDescription>
            Kontrahenci, opakowania i palety z wagą do obliczeń brutto.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="counterparties">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="counterparties">Kontrahenci</TabsTrigger>
            <TabsTrigger value="containers">Opakowania</TabsTrigger>
            <TabsTrigger value="pallets">Palety</TabsTrigger>
          </TabsList>
          <TabsContent value="counterparties" className="mt-4">
            <Label className="mb-2 block text-xs text-muted-foreground">
              Kontrahenci ({cat.counterparties.length})
            </Label>
            <CounterpartyEditor
              items={cat.counterparties}
              onAdd={cat.addCounterparty}
              onUpdateCurrency={cat.updateCounterpartyCurrency}
              onRemove={cat.removeCounterparty}
            />
          </TabsContent>
          <TabsContent value="containers" className="mt-4">
            <Label className="mb-2 block text-xs text-muted-foreground">
              Opakowania ({cat.containers.length}) · nazwa i waga sztuki (kg)
            </Label>
            <ListEditor
              items={cat.containers}
              onAdd={cat.addContainer}
              onUpdate={cat.updateContainer}
              onRemove={cat.removeContainer}
              namePlaceholder="Karton 600 x 400"
              weightPlaceholder="kg"
            />
          </TabsContent>
          <TabsContent value="pallets" className="mt-4">
            <Label className="mb-2 block text-xs text-muted-foreground">
              Palety ({cat.pallets.length}) · nazwa i waga palety (kg)
            </Label>
            <ListEditor
              items={cat.pallets}
              onAdd={cat.addPallet}
              onUpdate={cat.updatePallet}
              onRemove={cat.removePallet}
              namePlaceholder="Europaleta"
              weightPlaceholder="kg"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
