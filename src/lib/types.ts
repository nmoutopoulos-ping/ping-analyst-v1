export interface Deal {
  id?: string;
  search_id: string;
  address: string;
  short_address: string;
  email: string;
  api_key?: string;
  stage: string;
  created_at: string;
  comp_summary?: {
    beds?: number;
    baths?: number;
    units?: number;
    avg_rent: number;
    avg_sqft: number;
    count: number;
  }[];
  assumptions_snapshot?: Assumptions;
  preset_name?: string;
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
  image_url?: string;
}

export interface DealPhoto {
  id: string;
  deal_id: string;
  api_key: string;
  storage_path?: string;
  file_name: string;
  caption?: string;
  label?: string;
  sort_order: number;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  /** External image URL (paste-based workflow) */
  image_url?: string;
  /** Populated client-side after fetching a signed URL */
  signed_url?: string;
}

export const PHOTO_LABELS = [
  "Exterior",
  "Interior",
  "Kitchen",
  "Bathroom",
  "Bedroom",
  "Living Room",
  "Lobby",
  "Roof",
  "Mechanical",
  "Parking",
  "Neighborhood",
  "Other",
] as const;

export type PhotoLabel = (typeof PHOTO_LABELS)[number];

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

export type UnitType = "Studio" | "1BA" | "2BA" | "3BA" | "4BA" | "5BA";

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
