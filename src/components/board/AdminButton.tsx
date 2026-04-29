import { useState } from "react";
import { Lock, ShieldCheck, LogOut, Truck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS, useAdmin } from "@/hooks/use-admin";
import { toast } from "@/hooks/use-toast";

export const AdminButton = () => {
  const { role, isAuthed, unlock, lock } = useAdmin();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");

  if (isAuthed) {
    const Icon =
      role === "admin" ? ShieldCheck : role === "manager" ? Briefcase : Truck;
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => {
          lock();
          toast({ title: "Wylogowano" });
        }}
      >
        <Icon className="h-4 w-4 text-[hsl(var(--status-done))]" />
        {ROLE_LABELS[role]}
        <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = unlock(pin);
    if (next) {
      toast({ title: `Zalogowano: ${ROLE_LABELS[next]}` });
      setOpen(false);
      setPin("");
    } else {
      toast({ title: "Nieprawidłowy PIN", variant: "destructive" });
      setPin("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPin(""); }}>
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Lock className="h-4 w-4" />
        Zaloguj
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Logowanie</DialogTitle>
          <DialogDescription>
            Wprowadź PIN. Role: Administrator, Menedżer, Magazynier.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="admin-pin">Kod PIN</Label>
            <Input
              id="admin-pin"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
            />
          </div>
          <DialogFooter>
            <Button type="submit">Zaloguj</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
