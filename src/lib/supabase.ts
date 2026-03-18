import type { Deal, AssumptionTemplate, Assumptions } from "./types";

const SB_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://knimxvcbrtkuhsuovasu.supabase.co";

const SB_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaW14dmNicnRrdWhzdW92YXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDEyNjAsImV4cCI6MjA4OTE3NzI2MH0.g3Gcz-c41C9jnxy5Gba_jzrV1ATjy5_Wr5yaIXOHY8M";

const H: Record<string, string> = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

const f = (v: unknown) =>
  v != null && v !== "" ? parseFloat(String(v)) : undefined;
const i = (v: unknown) =>
  v != null && v !== "" ? parseInt(String(v), 10) : undefined;

const DS =
  "search_id,address,short_address,email,api_key,price,cost,sqft,total_units,radius,deal_stage,combos,comp_summary,excel_path,docx_path,excel_data,docx_data,results,status,created_at,preset_name,archived";

function normalizeDeal(row: Record<string, unknown>): Deal {
  return {
    search_id: String(row.search_id || ""),
    address: String(row.address || ""),
    short_address: String(row.short_address || row.address || ""),
    email: String(row.email || ""),
    stage: (row.deal_stage as string) || "New",
    created_at: String(row.created_at || ""),
    comp_summary: (row.comp_summary as Deal["comp_summary"]) || undefined,
    search_meta: {
      address: String(row.address || ""),
      price: f(row.price),
      listing_price: f(row.price),
      cost: f(row.cost),
      sqft: f(row.sqft),
      total_units: i(row.total_units),
      radius: f(row.radius),
      combos: (row.combos as { bed: number; bath: number; units: number }[]) || [],
    },
    results: (row.results as Deal["results"]) || null,
    excel_data: (row.excel_data as unknown) || null,
    docx_data: (row.docx_data as unknown) || null,
    excel_path: row.excel_path ? String(row.excel_path) : undefined,
    docx_path: row.docx_path ? String(row.docx_path) : undefined,
  };
}

export async function supabaseLogin(
  email: string,
  apiKey: string
): Promise<{ name: string; email: string } | null> {
  const r = await fetch(
    `${SB_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&api_key=eq.${encodeURIComponent(apiKey)}&select=name,email&limit=1`,
    { headers: H }
  );
  if (!r.ok) throw new Error("Supabase login error");
  const d = await r.json();
  return d.length > 0 ? d[0] : null;
}

export async function supabaseGetDeals(apiKey: string): Promise<Deal[]> {
  const r = await fetch(
    `${SB_URL}/rest/v1/deals?api_key=eq.${encodeURIComponent(apiKey)}&archived=eq.false&select=${DS}&order=created_at.desc`,
    { headers: H }
  );
  if (!r.ok) throw new Error("Failed to fetch deals");
  return ((await r.json()) as Record<string, unknown>[]).map(normalizeDeal);
}

export async function supabaseGetDeal(
  searchId: string,
  apiKey: string
): Promise<Deal | null> {
  const r = await fetch(
    `${SB_URL}/rest/v1/deals?search_id=eq.${encodeURIComponent(searchId)}&api_key=eq.${encodeURIComponent(apiKey)}&select=${DS}&limit=1`,
    { headers: H }
  );
  if (!r.ok) throw new Error("Failed to fetch deal");
  const d = (await r.json()) as Record<string, unknown>[];
  return d.length > 0 ? normalizeDeal(d[0]) : null;
}

export async function supabaseGetTemplates(apiKey: string) {
  const r = await fetch(
    `${SB_URL}/rest/v1/templates?api_key=eq.${encodeURIComponent(apiKey)}&order=created_at.desc`,
    { headers: H }
  );
  if (!r.ok) throw new Error("Failed to fetch templates");
  return r.json();
}

export async function supabaseCreateTemplate(
  data: Record<string, unknown>
) {
  const email = localStorage.getItem("ping_user_email") || "";
  const r = await fetch(`${SB_URL}/rest/v1/templates`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ ...data, email }),
  });
  if (!r.ok) throw new Error("Failed to create template");
  const d = await r.json();
  return d[0];
}

export async function supabaseUpdateTemplate(
  id: string,
  data: Record<string, unknown>
) {
  const r = await fetch(`${SB_URL}/rest/v1/templates?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Failed to update template");
  const d = await r.json();
  return d[0];
}

export async function supabaseDeleteTemplate(id: string) {
  const r = await fetch(`${SB_URL}/rest/v1/templates?id=eq.${id}`, {
    method: "DELETE",
    headers: H,
  });
  if (!r.ok) throw new Error("Failed to delete template");
}

export async function supabaseArchiveDeal(searchId: string) {
  const r = await fetch(
    `${SB_URL}/rest/v1/deals?search_id=eq.${encodeURIComponent(searchId)}`,
    {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({ archived: true }),
    }
  );
  if (!r.ok) throw new Error("Failed to archive deal");
}

// ── Assumption Templates ──

export async function supabaseGetAssumptionTemplates(apiKey: string): Promise<AssumptionTemplate[]> {
  const r = await fetch(
    `${SB_URL}/rest/v1/assumption_templates?api_key=eq.${encodeURIComponent(apiKey)}&order=created_at.desc`,
    { headers: H }
  );
  if (!r.ok) throw new Error("Failed to fetch assumption templates");
  return r.json();
}

export async function supabaseCreateAssumptionTemplate(
  apiKey: string,
  name: string,
  assumptions: Assumptions,
  isDefault: boolean
): Promise<AssumptionTemplate> {
  // If setting as default, clear other defaults first
  if (isDefault) {
    await fetch(
      `${SB_URL}/rest/v1/assumption_templates?api_key=eq.${encodeURIComponent(apiKey)}&is_default=eq.true`,
      { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify({ is_default: false }) }
    );
  }
  const r = await fetch(`${SB_URL}/rest/v1/assumption_templates`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ api_key: apiKey, name, assumptions, is_default: isDefault }),
  });
  if (!r.ok) throw new Error("Failed to create assumption template");
  const d = await r.json();
  return d[0];
}

export async function supabaseUpdateAssumptionTemplate(
  id: string,
  apiKey: string,
  data: { name?: string; assumptions?: Assumptions; is_default?: boolean }
): Promise<AssumptionTemplate> {
  if (data.is_default) {
    await fetch(
      `${SB_URL}/rest/v1/assumption_templates?api_key=eq.${encodeURIComponent(apiKey)}&is_default=eq.true`,
      { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify({ is_default: false }) }
    );
  }
  const r = await fetch(`${SB_URL}/rest/v1/assumption_templates?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error("Failed to update assumption template");
  const d = await r.json();
  return d[0];
}

export async function supabaseDeleteAssumptionTemplate(id: string) {
  const r = await fetch(`${SB_URL}/rest/v1/assumption_templates?id=eq.${id}`, {
    method: "DELETE",
    headers: H,
  });
  if (!r.ok) throw new Error("Failed to delete assumption template");
}

export async function supabaseGetSettings(apiKey: string) {
  const r = await fetch(
    `${SB_URL}/rest/v1/users?api_key=eq.${encodeURIComponent(apiKey)}&select=assumptions&limit=1`,
    { headers: H }
  );
  if (!r.ok) throw new Error("Failed to fetch settings");
  const d = await r.json();
  return { assumptions: (d[0]?.assumptions) || {} };
}

export async function supabaseUpdateSettings(apiKey: string, assumptions: Record<string, unknown>) {
  const r = await fetch(
    `${SB_URL}/rest/v1/users?api_key=eq.${encodeURIComponent(apiKey)}`,
    {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({ assumptions }),
    }
  );
  if (!r.ok) throw new Error("Failed to save settings");
}
