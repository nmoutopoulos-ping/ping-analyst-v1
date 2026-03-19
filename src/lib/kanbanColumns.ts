export interface KanbanColumn {
  id: string;
  label: string;
  color: string; // HSL string for the column header accent
  stages: string[]; // deal stages that map to this column
  order: number;
}

const STORAGE_KEY = "ping_kanban_columns";

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "processing", label: "Processing", color: "38 92% 50%", stages: ["Processing"], order: 0 },
  { id: "new", label: "New", color: "215 16% 47%", stages: ["New"], order: 1 },
  { id: "review", label: "Review", color: "217 91% 60%", stages: ["Review"], order: 2 },
  { id: "offer", label: "Offer", color: "38 92% 50%", stages: ["Offer"], order: 3 },
  { id: "contract", label: "Contract", color: "38 92% 50%", stages: ["Contract"], order: 4 },
  { id: "closed", label: "Closed", color: "160 84% 39%", stages: ["Closed"], order: 5 },
  { id: "pass", label: "Pass", color: "0 84% 60%", stages: ["Pass"], order: 6 },
];

export function getColumns(): KanbanColumn[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as KanbanColumn[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.sort((a, b) => a.order - b.order);
    }
  } catch { /* ignore */ }
  return DEFAULT_COLUMNS;
}

export function saveColumns(cols: KanbanColumn[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols.map((c, i) => ({ ...c, order: i }))));
}

export function resetColumns() {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_COLUMNS;
}

export const COLOR_PRESETS = [
  { name: "Gray", value: "215 16% 47%" },
  { name: "Blue", value: "217 91% 60%" },
  { name: "Amber", value: "38 92% 50%" },
  { name: "Green", value: "160 84% 39%" },
  { name: "Red", value: "0 84% 60%" },
  { name: "Purple", value: "270 70% 55%" },
  { name: "Teal", value: "180 70% 40%" },
  { name: "Pink", value: "330 80% 60%" },
];
