/**
 * supabase.ts — Supabase client for Ping Analyst CRM
 * ---------------------------------------------------
 * Uses Supabase Auth for authentication and the REST API for data access.
 * All queries are scoped to the authenticated user via RLS policies.
 *
 * v2.0 — Migrated from anon-key-only to Supabase Auth (JWT-based).
 * v2.1 — Added deal photo CRUD + storage upload/delete.
 */

import type { Deal, AssumptionTemplate, Assumptions, DealPhoto } from "./types";

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Auth session state ──────────────────────────────────────────────────────

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

// ── RentcastComp type ────────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH — Supabase Auth (email/password)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// DEALS
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

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
  await _ensureValidToken();
  const res = await fetch(`${SB_URL}/rest/v1/templates`, {
    method: "POST",
    headers: { ..._headers(), "Prefer": "return=representation" },
    body: JSON.stringify({ api_key: apiKey, email, ...template }),
  });
  if (!res.ok) throw new Error("Failed to create template");
  return res.json();
}

export async function supabaseUpdateTemplate(
  id: string,
  updates: Record<string, unknown>
) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/templates?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) throw new Error("Failed to update template");
  return res.json();
}

export async function supabaseDeleteTemplate(id: string) {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/templates?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", headers: _headers() }
  );
  if (!res.ok) throw new Error("Failed to delete template");
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEAL MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// ASSUMPTION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// USER SETTINGS (on users table)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE — Signed URLs for deal files
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// DEAL IMAGES — helper to resolve image URL with Street View fallback
// ═══════════════════════════════════════════════════════════════════════════════

const STREET_VIEW_KEY = import.meta.env.VITE_GOOGLE_STREET_VIEW_KEY || "";

/**
 * Returns the best available image URL for a deal:
 *   1. Listing photo captured by the extension (image_url on deal)
 *   2. Google Street View static image (if API key is configured)
 *   3. null (no image available)
 */
export function getDealImageUrl(deal: Deal): string | null {
  if (deal.image_url) return deal.image_url;
  if (STREET_VIEW_KEY && deal.address) {
    return `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodeURIComponent(deal.address)}&key=${STREET_VIEW_KEY}`;
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPS
// ═══════════════════════════════════════════════════════════════════════════════

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
// DEAL PHOTOS — CRUD + Storage upload/delete
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upload a photo file to Supabase Storage and create the deal_photos row.
 * Storage path: {apiKey}/{dealId}/{timestamp}_{filename}
 */
export async function supabaseUploadDealPhoto(
  apiKey: string,
  dealId: string,
  file: File,
  opts?: { caption?: string; label?: string; sortOrder?: number }
): Promise<DealPhoto | null> {
  await _ensureValidToken();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${apiKey}/${dealId}/${Date.now()}_${safeName}`;

  // 1. Upload binary to storage bucket
  const uploadRes = await fetch(
    `${SB_URL}/storage/v1/object/deal-photos/${storagePath}`,
    {
      method: "POST",
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${_accessToken}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: file,
    }
  );
  if (!uploadRes.ok) {
    console.error("Photo upload failed:", await uploadRes.text());
    return null;
  }

  // 2. Insert metadata row
  const row = {
    deal_id: dealId,
    api_key: apiKey,
    storage_path: storagePath,
    file_name: file.name,
    caption: opts?.caption || null,
    label: opts?.label || null,
    sort_order: opts?.sortOrder ?? 0,
    file_size: file.size,
    mime_type: file.type,
  };

  const insertRes = await fetch(`${SB_URL}/rest/v1/deal_photos`, {
    method: "POST",
    headers: { ..._headers(), "Prefer": "return=representation" },
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    console.error("Photo row insert failed:", await insertRes.text());
    // Clean up orphaned storage object
    await fetch(`${SB_URL}/storage/v1/object/deal-photos/${storagePath}`, {
      method: "DELETE",
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${_accessToken}` },
    });
    return null;
  }

  const [photo] = await insertRes.json();
  return photo;
}

/**
 * Fetch all photos for a deal, ordered by sort_order, with signed URLs.
 */
export async function supabaseGetDealPhotos(dealId: string): Promise<DealPhoto[]> {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/deal_photos?deal_id=eq.${encodeURIComponent(dealId)}&order=sort_order.asc,created_at.asc&select=*`,
    { headers: _headers() }
  );
  if (!res.ok) return [];
  const photos: DealPhoto[] = await res.json();

  // Batch-generate signed URLs
  const withUrls = await Promise.all(
    photos.map(async (p) => {
      const url = await supabaseCreateSignedUrl(`deal-photos/${p.storage_path}`, 3600);
      return { ...p, signed_url: url ?? undefined };
    })
  );
  return withUrls;
}

/**
 * Update photo metadata (caption, label, sort_order).
 */
export async function supabaseUpdateDealPhoto(
  photoId: string,
  updates: { caption?: string; label?: string; sort_order?: number }
): Promise<DealPhoto | null> {
  await _ensureValidToken();
  const res = await fetch(
    `${SB_URL}/rest/v1/deal_photos?id=eq.${encodeURIComponent(photoId)}`,
    {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify(updates),
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

/**
 * Batch-update sort_order for reordering.
 */
export async function supabaseReorderDealPhotos(
  photoOrders: { id: string; sort_order: number }[]
): Promise<void> {
  await _ensureValidToken();
  await Promise.all(
    photoOrders.map(({ id, sort_order }) =>
      fetch(`${SB_URL}/rest/v1/deal_photos?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: _headers(),
        body: JSON.stringify({ sort_order }),
      })
    )
  );
}

/**
 * Delete a photo — removes both the storage object and the metadata row.
 */
export async function supabaseDeleteDealPhoto(photo: DealPhoto): Promise<boolean> {
  await _ensureValidToken();

  // 1. Delete from storage
  const storageRes = await fetch(
    `${SB_URL}/storage/v1/object/deal-photos/${photo.storage_path}`,
    {
      method: "DELETE",
      headers: { "apikey": SB_KEY, "Authorization": `Bearer ${_accessToken}` },
    }
  );
  if (!storageRes.ok) {
    console.error("Storage delete failed:", await storageRes.text());
  }

  // 2. Delete metadata row
  const rowRes = await fetch(
    `${SB_URL}/rest/v1/deal_photos?id=eq.${encodeURIComponent(photo.id)}`,
    { method: "DELETE", headers: _headers() }
  );
  return rowRes.ok;
}
