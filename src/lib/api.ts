// v2 - auth key alignment
const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL || "https://analyst-ra00.onrender.com";

export function getApiKey(): string | null {
  return localStorage.getItem("apiKey");
}

export function getUserName(): string | null {
  return localStorage.getItem("userName");
}

export function getUserEmail(): string | null {
  return localStorage.getItem("userEmail");
}

export function setAuth(apiKey: string, name: string, email: string) {
  localStorage.setItem("apiKey", apiKey);
  localStorage.setItem("userName", name);
  localStorage.setItem("userEmail", email);
}

export function clearAuth() {
  localStorage.removeItem("apiKey");
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
}

export function isAuthenticated(): boolean {
  return !!getApiKey();
}

export async function apiGet<T>(path: string): Promise<T> {
  const key = getApiKey();
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_BASE}${path}${sep}api_key=${key}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return {} as T;
  const text = await res.text();
  return text ? JSON.parse(text) : ({} as T);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const key = getApiKey();
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_BASE}${path}${sep}api_key=${key}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getDownloadUrl(searchId: string, type: "excel" | "docx"): string {
  const key = getApiKey();
  return `${API_BASE}/deals/${searchId}/download/${type}?api_key=${key}`;
}
