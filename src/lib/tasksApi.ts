// Tasks & Notes API client for the Ping Analyst backend
const TASKS_API_BASE = "https://analyst-ra00.onrender.com";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type DealStage = "New" | "Review" | "Offer" | "Contract" | "Closed" | "Pass";

export interface DealTask {
  id: string;
  deal_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  deal_stage: DealStage | null;
  priority: TaskPriority;
  assignee_id: string | null;
  due_date: string | null;
  tags: string[];
  blocked_by: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DealNote {
  id: string;
  deal_id: string;
  user_id: string;
  parent_note_id: string | null;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("sb_access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

function qs(params: Record<string, string | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== "");
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

// ===== Tasks =====

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  deal_stage?: DealStage;
  deal_id?: string;
  assignee_id?: string;
}

export async function listTasks(filters: TaskFilters = {}): Promise<DealTask[]> {
  const res = await fetch(`${TASKS_API_BASE}/tasks${qs(filters as Record<string, string>)}`, {
    headers: authHeaders(),
  });
  const data = await handle<DealTask[] | { tasks: DealTask[] }>(res);
  return Array.isArray(data) ? data : data.tasks ?? [];
}

export async function listDealTasks(dealId: string, filters: Omit<TaskFilters, "deal_id"> = {}): Promise<DealTask[]> {
  const res = await fetch(`${TASKS_API_BASE}/deals/${dealId}/tasks${qs(filters as Record<string, string>)}`, {
    headers: authHeaders(),
  });
  const data = await handle<DealTask[] | { tasks: DealTask[] }>(res);
  return Array.isArray(data) ? data : data.tasks ?? [];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  deal_stage?: DealStage | null;
  due_date?: string | null;
  tags?: string[];
  sort_order?: number;
  deal_id?: string | null;
}

export async function createTask(input: CreateTaskInput, dealId?: string | null): Promise<DealTask> {
  const url = dealId
    ? `${TASKS_API_BASE}/deals/${dealId}/tasks`
    : `${TASKS_API_BASE}/tasks`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handle<DealTask>(res);
}

export async function updateTask(taskId: string, patch: Partial<CreateTaskInput>): Promise<DealTask> {
  const res = await fetch(`${TASKS_API_BASE}/tasks/${taskId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  return handle<DealTask>(res);
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${TASKS_API_BASE}/tasks/${taskId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handle<{ ok: boolean }>(res);
}

// ===== Notes =====

export async function listDealNotes(dealId: string): Promise<DealNote[]> {
  const res = await fetch(`${TASKS_API_BASE}/deals/${dealId}/notes`, {
    headers: authHeaders(),
  });
  const data = await handle<DealNote[] | { notes: DealNote[] }>(res);
  return Array.isArray(data) ? data : data.notes ?? [];
}

export interface CreateNoteInput {
  content: string;
  parent_note_id?: string | null;
  is_pinned?: boolean;
}

export async function createNote(dealId: string, input: CreateNoteInput): Promise<DealNote> {
  const res = await fetch(`${TASKS_API_BASE}/deals/${dealId}/notes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handle<DealNote>(res);
}

export async function updateNote(noteId: string, patch: { content?: string; is_pinned?: boolean }): Promise<DealNote> {
  const res = await fetch(`${TASKS_API_BASE}/notes/${noteId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  });
  return handle<DealNote>(res);
}

export async function deleteNote(noteId: string): Promise<void> {
  const res = await fetch(`${TASKS_API_BASE}/notes/${noteId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  await handle<{ ok: boolean }>(res);
}

// ===== Helpers =====

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/10 text-blue-600",
  high: "bg-amber-500/15 text-amber-700",
  urgent: "bg-rose-500/15 text-rose-700",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const DEAL_STAGES: DealStage[] = ["New", "Review", "Offer", "Contract", "Closed", "Pass"];

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function isOverdue(due_date: string | null, status: TaskStatus): boolean {
  if (!due_date || status === "done") return false;
  const d = new Date(due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}
