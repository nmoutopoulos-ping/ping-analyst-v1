// Files API client for the Ping Analyst backend
const FILES_API_BASE = "https://analyst-ra00.onrender.com";

export type FileCategory =
  | "report" | "underwriting" | "legal" | "inspection"
  | "appraisal" | "environmental" | "insurance" | "other";

export interface DealFile {
  id: string;
  deal_id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  category: FileCategory;
  notes: string | null;
  created_at: string;
  updated_at: string;
  uploader_name?: string | null;
}

export const FILE_CATEGORIES: FileCategory[] = [
  "report", "underwriting", "legal", "inspection",
  "appraisal", "environmental", "insurance", "other",
];

export const CATEGORY_LABEL: Record<FileCategory, string> = {
  report: "Report",
  underwriting: "Underwriting",
  legal: "Legal",
  inspection: "Inspection",
  appraisal: "Appraisal",
  environmental: "Environmental",
  insurance: "Insurance",
  other: "Other",
};

export const CATEGORY_CLASS: Record<FileCategory, string> = {
  report: "bg-blue-500/10 text-blue-700",
  underwriting: "bg-emerald-500/10 text-emerald-700",
  legal: "bg-amber-500/10 text-amber-800",
  inspection: "bg-violet-500/10 text-violet-700",
  appraisal: "bg-cyan-500/10 text-cyan-700",
  environmental: "bg-lime-500/10 text-lime-800",
  insurance: "bg-rose-500/10 text-rose-700",
  other: "bg-muted text-muted-foreground",
};

function bearer(): HeadersInit {
  const token = localStorage.getItem("sb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

export async function listDealFiles(dealId: string): Promise<DealFile[]> {
  const res = await fetch(`${FILES_API_BASE}/deals/${dealId}/files`, { headers: bearer() });
  const data = await handle<DealFile[] | { files: DealFile[] }>(res);
  return Array.isArray(data) ? data : data.files ?? [];
}

export async function uploadDealFile(
  dealId: string,
  file: File,
  category?: FileCategory,
  notes?: string,
): Promise<DealFile> {
  const fd = new FormData();
  fd.append("file", file);
  if (category) fd.append("category", category);
  if (notes) fd.append("notes", notes);
  const res = await fetch(`${FILES_API_BASE}/deals/${dealId}/files`, {
    method: "POST",
    headers: bearer(), // do not set Content-Type
    body: fd,
  });
  return handle<DealFile>(res);
}

export interface FileDownloadResp {
  url: string;
  filename: string;
  file_type: string;
  expires_in: number;
}

export async function getFileDownloadUrl(fileId: string): Promise<FileDownloadResp> {
  const res = await fetch(`${FILES_API_BASE}/files/${fileId}/download`, { headers: bearer() });
  return handle<FileDownloadResp>(res);
}

export async function updateFile(
  fileId: string,
  patch: { category?: FileCategory; notes?: string | null; filename?: string },
): Promise<DealFile> {
  const res = await fetch(`${FILES_API_BASE}/files/${fileId}`, {
    method: "PATCH",
    headers: { ...bearer(), "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return handle<DealFile>(res);
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`${FILES_API_BASE}/files/${fileId}`, {
    method: "DELETE",
    headers: bearer(),
  });
  await handle<{ ok: boolean }>(res);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function fileIconType(file_type: string, filename: string): "pdf" | "word" | "excel" | "image" | "file" {
  const t = (file_type || "").toLowerCase();
  const n = filename.toLowerCase();
  if (t.includes("pdf") || n.endsWith(".pdf")) return "pdf";
  if (t.includes("word") || n.endsWith(".doc") || n.endsWith(".docx")) return "word";
  if (t.includes("sheet") || t.includes("excel") || n.endsWith(".xls") || n.endsWith(".xlsx") || n.endsWith(".csv")) return "excel";
  if (t.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(n)) return "image";
  return "file";
}
