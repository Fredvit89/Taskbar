import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Task } from "@/types/task";
import { TaskDialog } from "@/components/board/TaskDialog";
import { CalendarBoard } from "@/components/board/CalendarBoard";
import { AdminButton } from "@/components/board/AdminButton";
import { CatalogsDialog } from "@/components/board/CatalogsDialog";
import { AdminProvider, ROLE_LABELS, useAdmin } from "@/hooks/use-admin";
import { CatalogsProvider } from "@/hooks/use-catalogs";

const STORAGE_KEY = "task-board-v1";

const todayISO = () => format(new Date(), "yyyy-MM-dd");

const BoardInner = () => {
  const { isAdmin, canEdit, role } = useAdmin();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        setTasks(
          parsed.map((t) => ({
            ...t,
            dueDate: t.dueDate || format(new Date(t.createdAt), "yyyy-MM-dd"),
            items: (t.items ?? []).map((it: any) => ({
              ...it,
              sorts: Array.isArray(it.sorts) ? it.sorts : it.sort ? [it.sort] : [],
            })),
          }))
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const handleCreate = (data: Omit<Task, "id" | "status" | "createdAt">) => {
    setTasks((prev) => [
      {
        ...data,
        id: crypto.randomUUID(),
        status: "todo",
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  };

  const handleDelete = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const handleEdit = (
    taskId: string,
    data: Omit<Task, "id" | "status" | "createdAt">
  ) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...data } : t))
    );

  const handleResetReady = (taskId: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id !== taskId
          ? t
          : { ...t, items: t.items.map((it) => ({ ...it, readyPallets: 0 })) }
      )
    );

  const handleMoveDate = (taskId: string, newDate: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dueDate: newDate } : t))
    );

  const handleUpdateReady = (taskId: string, itemId: string, delta: number) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id !== taskId
          ? t
          : {
              ...t,
              items: t.items.map((it) =>
                it.id !== itemId
                  ? it
                  : {
                      ...it,
                      readyPallets: Math.max(
                        0,
                        Math.min(it.pallets, (it.readyPallets ?? 0) + delta)
                      ),
                    }
              ),
            }
      )
    );

  const totals = useMemo(() => {
    const totalPallets = tasks.reduce(
      (s, t) => s + t.items.reduce((a, i) => a + i.pallets, 0),
      0
    );
    const totalBoxes = tasks.reduce(
      (s, t) => s + t.items.reduce((a, i) => a + i.pallets * i.boxesPerPallet, 0),
      0
    );
    return { totalPallets, totalBoxes };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/40">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="container flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              Tablica zadań
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kontrahent, odmiana, opakowanie, palety i waga
              {role !== "guest" && ` · ${ROLE_LABELS[role]}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:gap-6">
            <div className="hidden text-sm md:block">
              <div className="text-muted-foreground">Razem</div>
              <div className="font-semibold">
                {tasks.length} zadań · {totals.totalPallets} palet ·{" "}
                {totals.totalBoxes} op.
              </div>
            </div>
            {isAdmin && <CatalogsDialog />}
            <AdminButton />
            {canEdit && <TaskDialog onCreate={handleCreate} defaultDate={todayISO()} />}
          </div>
        </div>
      </header>

      <main className="container py-6">
        <CalendarBoard
          tasks={tasks}
          onCreate={handleCreate}
          onDelete={handleDelete}
          onUpdateReady={handleUpdateReady}
          onEdit={handleEdit}
          onResetReady={handleResetReady}
          onMoveDate={handleMoveDate}
        />
      </main>
    </div>
  );
};

const Index = () => (
  <AdminProvider>
    <CatalogsProvider>
      <BoardInner />
    </CatalogsProvider>
  </AdminProvider>
);

export default Index;
