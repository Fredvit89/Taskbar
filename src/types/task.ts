export type TaskStatus = "todo" | "in_progress" | "done";

export interface TaskItem {
  id: string;
  /** Wybrane odmiany (kilka mo\u017cna po\u0142\u0105czy\u0107 w jednej pozycji) */
  sorts: string[];
  /** Min. kaliber w mm */
  caliberMin?: number;
  /** Maks. kaliber w mm */
  caliberMax?: number;
  container: string;
  palletType: string;
  pallets: number;
  boxesPerPallet: number;
  boxWeight: number;
  readyPallets: number;
  notes?: string;
  /** Cena za kg netto (PLN). Widoczna tylko dla administratora. */
  pricePerKg?: number;
}

export interface Task {
  id: string;
  counterparty: string;
  items: TaskItem[];
  status: TaskStatus;
  createdAt: number;
  /** ISO date (YYYY-MM-DD) — data dostawy / wysyłki */
  dueDate: string;
  /** Numer rejestracyjny auta */
  truckPlate?: string;
}

export const STATUS_META: Record<TaskStatus, { label: string; tone: string }> = {
  todo: { label: "Zadania", tone: "bg-[hsl(var(--status-todo))]" },
  in_progress: { label: "W toku", tone: "bg-[hsl(var(--status-progress))]" },
  done: { label: "Gotowe", tone: "bg-[hsl(var(--status-done))]" },
};
