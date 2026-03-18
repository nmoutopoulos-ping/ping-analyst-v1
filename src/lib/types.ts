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
}

export interface Assumptions {
  ltv: number;
  closing_pct: number;
  vacancy: number;
  opex_ratio: number;
  int_rate: number;
  rent_growth_1: number;
  other_inc_mo: number;
}
