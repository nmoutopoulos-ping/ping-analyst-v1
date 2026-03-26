/**
 * supabase.ts â Supabase client for Ping Analyst CRM
 * ---------------------------------------------------
 * Uses Supabase Auth for authentication and the REST API for data access.
 * All queries are scoped to the authenticated user via RLS policies.
 *
 * v2.0 â Migrated from anon-key-only to Supabase Auth (JWT-based).
 */

import type { Deal, AssumptionTemplate, Assumptions } from "./types";

const SB_URL = import.meta.env.VITE_SUPABASE_URL || "https://knimxvcbrtkuhsuovasu.supabase.co";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaW14dmNicnRrdWhzdW92YXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDEyNjAsImV4cCI6MjA4OTE3NzI2MH0.g3Gcz-c41C9jnxy5Gba_jzrV1ATjy5_Wr5yaIXOHY8M";

// ââ Auth session state ââââââââââââââââââââââââââââââââââââââââââââââââââââââ

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _tokenExpiresAt = 0;

function _headers(): Record<string, string> {
  const h: Record<string, string> = {
    "apikey": SB_KEY,
    "Content-Type": "application/json",
  };
  if (_accessToken) {
    h["Authorization"] = `Bearer ${_accessToken}`;
  } else {
    h["Authorization"] = `Bearer ${SB_KEY}`;
  }
  return h;
}

function _saveSession(access: string, refresh: string, expiresIn: number) {
  _accessToken = access;
  _refreshToken = refresh;
  _tokenExpiresAt = Date.now() + expiresIn * 1000;
  try {
    localStorage.setItem("sb_access_token", access);
    localStorage.setItem("sb_refresh_token", refresh);
    localStorage.setItem("sb_expires_at", String(_tokenExpiresAt));
  } catch (_) { /* ignore */ }
}

function _loadSession() {
  try {
    _accessToken = localStorage.getItem("sb_access_token");
    _refreshToken = localStorage.getItem("sb_refresh_token");
    _tokenExpiresAt = Number(localStorage.getItem("sb_expires_at") || "0");
  } catch (_) { /* ignore */ }
}

async function _ensureValidToken(): Promise<boolean> {
  if (_accessToken && Date.now() < _tokenExpiresAt - 60_000) return true;
  if (!_refreshToken) return false;
  try {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SB_KEY },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    _saveSession(data.access_token, data.refresh_token, data.expires_in);
    return true;
  } catch (_) {
    return false;
  }
}

// ââ RentcastComp type ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export type RentcastComp = {
  id: string;
  deal_id: string;
  search_id: string;
  comp_id: string;
  formatted_address: string;
  url: string;
  rank: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_footage: number;
  price: number;
  latitude: number;
  longitude: number;
  distance_m: number;
  distance_km: number;
  filter_beds: number;
  filter_baths: number;
  days_on_market: number;
  listing_status: string;
  purchase_price: number;
  improvements: number;
  created_at: string;
};

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// AUTH â Supabase Auth (email/password)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function supabaseLogin(
  email: string,
  password: string
): Promise<{ ok: boolean; apiKey?: string; name?: string; error?: string }> {
  try {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SB_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return { ok: false, error: data.error_description || data.msg || "Login failed" };
    }
    _saveSession(data.access_token, data.refresh_token, data.expires_in);
    const meta = data.user?.user_metadata || {};
    return { ok: true, apiKey: meta.api_key, name: meta.name };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Login failed" };
  }
}

export function supabaseLogout() {
  _accessToken = null;
  _refreshToken = null;
  _tokenExpiresAt = 0;
  try {
    localStorage.removeItem("sb_access_token");
    localStorage.removeItem("sb_refresh_token");
    localStorage.removeItem("sb_expires_at");
  } catch (_) { /* ignore */ }
}

export async function supabaseRestoreSession(): Promise<boolean> {
  _loadSession();
  return _ensureValidToken();
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// DEALS
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function supabaseGetDeals(apiKey: string): Promise<Deal[]> {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/deals?api_key=eq.${encodeURIComponent(apiKey)}&order=created_at.desc&select=*`,
    { headers: _headers() }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function supabaseGetDeal(
  searchId: string,
  apiKey: string
): Promise<Deal | null> {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/deals?search_id=eq.${encodeURIComponent(searchId)}&api_key=eq.${encodeURIComponent(apiKey)}&select=*&limit=1`,
    { headers: _headers() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SEARCH TEMPLATES
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function supabaseGetTemplates(apiKey: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/templates?api_key=eq.${encodeURIComponent(apiKey)}&order=created_at.desc&select=*`,
    { headers: _headers() }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function supabaseCreateTemplate(
  apiKey: string,
  email: string,
  template: Record<string, unknown>
) {
  const valid = await _ensureValidToken();
  if (!valid) console.warn("[supabaseCreateTemplate] No valid auth session â request may fail");
  const body = { api_key: apiKey, email, ...template };
  // Remove nested api_key duplication from template data
  delete body.api_key;
  body.api_key = apiKey;
  console.log("[supabaseCreateTemplate] Sending body keys:", Object.keys(body));
  const res = await fetch(`${SB_URL}/rest/v1/templates`, {
    method: "POST",
    headers: { ..._headers(), "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error("[supabaseCreateTemplate] Error:", res.status, errBody);
    throw new Error(`Failed to create template (${res.status}): ${errBody}`);
  }
  return res.json();
}

export async function supabaseUpdateTemplate(
  id: string,
  updates: Record<string, unknown>
) {
  const valid = await _ensureValidToken();
  if (!valid) console.warn("[supabaseUpdateTemplate] No valid auth session");
  const res = await fetch(
    `${SB_URL}/rest/v1/templates?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    console.error("[supabaseUpdateTemplate] Error:", res.status, errBody);
    throw new Error(`Failed to update template (${res.status}): ${errBody}`);
  }
  return res.json();
}

export async function supabaseDeleteTemplate(id: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/templates?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: _headers() }
  );
  if (!res.ok) {
    const errBody = await res.text();
    console.error("[supabaseDeleteTemplate] Error:", res.status, errBody);
    throw new Error(`Failed to delete template (${res.status}): ${errBody}`);
  }
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// DEAL MANAGEMENT
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function supabaseArchiveDeal(searchId: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/deals?search_id=eq.${encodeURIComponent(searchId)}`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify({ archived: true }),
    }
  );
  if (!res.ok) throw new Error("Failed to archive deal");
  return res.json();
}

export async function supabaseUpdateDealStage(searchId: string, stage: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/deals?search_id=eq.${encodeURIComponent(searchId)}`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify({ deal_stage: stage }),
    }
  );
  if (!res.ok) throw new Error("Failed to update deal stage");
  return res.json();
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// ASSUMPTION TEMPLATES
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function supabaseGetAssumptionTemplates(apiKey: string): Promise<AssumptionTemplate[]> {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/assumption_templates?api_key=eq.${encodeURIComponent(apiKey)}&order=created_at.asc&select=*`,
    { headers: _headers() }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function supabaseCreateAssumptionTemplate(
  apiKey: string,
  name: string,
  assumptions: Assumptions,
  isDefault = false
) {
  await _ensureValidToken();
  const res = await fetch(`${SB_URL}/rest/v1/assumption_templates`, {
    method: "POST",
    headers: { ..._headers(), "Prefer": "return=representation" },
    body: JSON.stringify({
      api_key: apiKey,
      name,
      assumptions,
      is_default: isDefault,
    }),
  });
  if (!res.ok) throw new Error("Failed to create assumption template");
  return res.json();
}

export async function supabaseUpdateAssumptionTemplate(
  id: string,
  updates: { name?: string; assumptions?: Assumptions; is_default?: boolean }
) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/assumption_templates?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) throw new Error("Failed to update assumption template");
  return res.json();
}

export async function supabaseDeleteAssumptionTemplate(id: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/assumption_templates?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: _headers() }
  );
  if (!res.ok) throw new Error("Failed to delete assumption template");
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// USER SETTINGS (on users table)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function supabaseGetSettings(apiKey: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/users?api_key=eq.${encodeURIComponent(apiKey)}&select=assumptions&limit=1`,
    { headers: _headers() }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0]?.assumptions || null;
}

export async function supabaseUpdateSettings(apiKey: string, assumptions: Record<string, unknown>) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/users?api_key=eq.${encodeURIComponent(apiKey)}`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify({ assumptions }),
    }
  );
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// STORAGE â Signed URLs for deal files
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function supabaseCreateSignedUrl(
  bucketPath: string,
  expiresIn = 3600
): Promise<string | null> {
  await _ensureValidToken();
  // bucketPath format: "deal-files/SRCH-xxx/filename.xlsx"
  const parts = bucketPath.split("/");
  const bucket = parts[0];
  const objectPath = parts.slice(1).join("/");

  const res = await fetch(
    `${SB_URL}/storage/v1/object/sign/${bucket}/${objectPath}`,
    {
      method: "POST",
      headers: _headers(),
      body: JSON.stringify({ expiresIn }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.signedURL ? `${SB_URL}/storage/v1${data.signedURL}` : null;
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// COMPS
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export async function supabaseGetComps(dealIds: string[]): Promise<RentcastComp[]> {
  if (!dealIds.length) return [];
  await _ensureValidToken();
  const filter = dealIds.map(id => `"${id}"`).join(",");
  const res = await fetch(
    `${SB_URL}/rest/v1/rentcast_comps?deal_id=in.(${filter})&select=*`,
    { headers: _headers() }
  );
  if (!res.ok) return [];
  return res.json();
}


// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function supabaseGetNotifications(apiKey: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/notifications?api_key=eq.${encodeURIComponent(apiKey)}&order=created_at.desc&limit=20&select=*`,
    { headers: _headers() }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function supabaseMarkNotificationRead(id: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/notifications?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify({ read: true }),
    }
  );
  if (!res.ok) throw new Error("Failed to mark notification read");
  return res.json();
}

export async function supabaseMarkAllNotificationsRead(apiKey: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/notifications?api_key=eq.${encodeURIComponent(apiKey)}&read=eq.false`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify({ read: true }),
    }
  );
  if (!res.ok) throw new Error("Failed to mark all notifications read");
  return res.json();
}
