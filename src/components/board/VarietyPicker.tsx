import { useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCatalogs } from "@/hooks/use-catalogs";
import { useAdmin } from "@/hooks/use-admin";

interface VarietyPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
  id?: string;
}

export const VarietyPicker = ({ value, onChange, id }: VarietyPickerProps) => {
  const { varieties, addVariety } = useCatalogs();
  const { isAdmin } = useAdmin();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const submitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    addVariety(t);
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-auto min-h-10 w-full justify-between gap-2 px-3 py-1.5 text-left font-normal",
            value.length === 0 && "text-muted-foreground"
          )}
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {value.length === 0 ? (
              <span>Wybierz odmiany</span>
            ) : (
              value.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {v}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(v);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Usuń ${v}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <ScrollArea className="max-h-72">
          <div className="p-2">
            {varieties.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                Brak odmian. {isAdmin ? "Dodaj poniżej." : "Poproś admina o uzupełnienie słownika."}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {varieties.map((v) => {
                const active = value.includes(v);
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggle(v)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "bg-background hover:bg-muted"
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        </ScrollArea>
        {isAdmin && (
          <form onSubmit={submitNew} className="flex gap-2 border-t p-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nowa odmiana"
              className="h-8 flex-1 text-sm"
            />
            <Button type="submit" size="sm" className="h-8 gap-1">
              <Plus className="h-3.5 w-3.5" /> Dodaj
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
};
