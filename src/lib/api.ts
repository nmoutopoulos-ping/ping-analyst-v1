const API_BASE = "https://analyst-ra00.onrender.com";

export function getApiKey(): string | null {
  return localStorage.getItem("ping_api_key");
}

export function getUserName(): string | null {
  return localStorage.getItem("ping_user_name");
}

export function setAuth(apiKey: string, name: string, email: string) {
  localStorage.setItem("ping_api_key", apiKey);
  localStorage.setItem("ping_user_name", name);
  localStorage.setItem("ping_user_email", email);
}

export function clearAuth() {
  localStorage.removeItem("ping_api_key");
  localStorage.removeItem("ping_user_name");
  localStorage.removeItem("ping_user_email");
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
  return res.json();
}

export function getDownloadUrl(searchId: string, type: "excel" | "docx"): string {
  const key = getApiKey();
  return `${API_BASE}/deals/${searchId}/download/${type}?api_key=${key}`;
}
