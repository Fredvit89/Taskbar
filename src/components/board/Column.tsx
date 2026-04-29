import { Task, TaskStatus, STATUS_META } from "@/types/task";
import { TaskCard } from "./TaskCard";

interface ColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onDelete: (id: string) => void;
  onUpdateReady: (taskId: string, itemId: string, delta: number) => void;
  onEdit: (taskId: string, data: Omit<Task, "id" | "status" | "createdAt">) => void;
  onResetReady: (taskId: string) => void;
}

export const Column = ({ status, tasks, onDelete, onUpdateReady, onEdit, onResetReady }: ColumnProps) => {
  const meta = STATUS_META[status];
  return (
    <div className="flex flex-col rounded-xl border bg-card/50 p-4 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.tone}`} />
          <h2 className="font-semibold">{meta.label}</h2>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3">
        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-border/60 py-10 text-sm text-muted-foreground">
            Brak zadań
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onDelete={onDelete}
              onUpdateReady={onUpdateReady}
              onEdit={onEdit}
              onResetReady={onResetReady}
            />
          ))
        )}
      </div>
    </div>
  );
};
