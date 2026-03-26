export interface Deal {
  search_id: string;
  address: string;
  short_address: string;
  email: string;
  stage: string;
  created_at: string;
  comp_summary?: {
    avg_rent: number;
    avg_sqft: number;
    count: number;
  };
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
export type UnitType = typeof UNIT_TYPES[number];

export interface UnitCombo {
  bed: number;
  bath: number;
  units: number;
  type?: UnitType;
}

export interface CommercialSpace {
  space_type: string;
  sqft: number;
  price_per_sqft: number;
  annual_revenue: number;
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
