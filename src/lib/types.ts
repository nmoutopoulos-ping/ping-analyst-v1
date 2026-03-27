export interface CompSummaryEntry {
  beds: string;
  baths: string;
  count: number;
  units: number;
  avg_rent: number;
  avg_sqft: number;
}

export interface Deal {
  search_id: string;
  address: string;
  short_address: string;
  email: string;
  stage: string;
  created_at: string;
  comp_summary?: CompSummaryEntry[];
  search_meta: {
    address: string;
    listing_price?: number;
    price?: number;
    cost?: number;
    sqft?: number;
    total_units?: number;
    radius?: number;
    combos?: { bed: number; bath: number; units: number }[];
  };
  results?: {
    coc?: number;
    moic?: number;
    irr?: number;
    cap_rate?: number;
    noi?: number;
    monthly_cash_flow?: number;
    loan_amount?: number;
    down_payment?: number;
    dscr?: number;
  };
  excel_path?: string;
  docx_path?: string;
  excel_data?: unknown;
  docx_data?: unknown;
}

export interface Assumptions {
  ltv: number;
  closingPct: number;
  vacancy: number;
  opexRatio: number;
  intRate: number;
  rentGrowth1: number;
  otherIncMo: number;
}

export const UNIT_TYPES = ["Apartment", "Condo", "Townhouse", "Single Family", "Duplex", "Triplex", "Multi Family"] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export interface UnitCombo {
  bed: number;
  bath: number;
  units: number;
  type?: UnitType;
}

// ── Commercial Spaces ────────────────────────────────────────────────────────
// Field names match the Chrome extension + backend (main.py, excel_writer.py).
// `type`      = space category (Retail, Office, etc.)
// `sqft`      = total square footage of the space
// `rentPerSF` = annual rent per square foot ($/SF/Yr)
//
// Backend calculates annual commercial revenue as: sqft × rentPerSF
// This is added to residential GPR for underwriting.
//
// Legacy CRM data may use `space_type` / `price_per_sqft` / `annual_revenue`.
// Both the extension and CRM handle these via fallback mapping on load.

export const COMMERCIAL_TYPES = [
  "Retail",
  "Office",
  "Restaurant",
  "Medical / Dental",
  "Flex Space",
] as const;

export type CommercialSpaceType = (typeof COMMERCIAL_TYPES)[number];

export interface CommercialSpace {
  type: string;       // one of COMMERCIAL_TYPES
  sqft: number;       // square footage
  rentPerSF: number;  // annual rent per SF ($/SF/Yr)
}

export interface Template {
  id: string;
  name: string;
  is_default?: boolean;
  address: string;
  lat?: number;
  lng?: number;
  price?: number;
  improvements?: number;
  sqft?: number;
  combos: UnitCombo[];
  total_units: number;
  radius?: number;
  min_comps?: number;
  max_comps?: number;
  commercial_spaces?: CommercialSpace[];
  status?: string;
  created_at?: string;
}

export interface AssumptionTemplate {
  id: string;
  api_key?: string;
  name: string;
  assumptions: Assumptions;
  is_default: boolean;
  created_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  search_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}
