/**
 * Legacy = what compute_returns() writes (current /trigger and the 47
 *          backfilled Base rows): irr, coc, noi, cap_rate, moic, dscr,
 *          loan_amount, down_payment, monthly_cash_flow.
 * v1.1   = Results Contract v1.1 that Pipeline/rerun.py emits:
 *          levered_irr, avg_coc, noi_stabilized, coc_year1, cfbt_year1,
 *          cap_rate_going_in, acquisition_price, loan_amount,
 *          equity_required, ltv, interest_rate, exit_cap_rate.
 *
 * This reads either shape and returns one normalized view.
 */

export type NormalizedResults = {
  levered_irr: number | string | null;
  moic: number | null;
  lp_moic: number | null;
  avg_coc: number | null;
  coc_year1: number | null;
  noi: number | null;
  cfbt_year1: number | null;
  dscr: number | null;
  cap_rate: number | null;
  acquisition_price: number | null;
  loan_amount: number | null;
  equity_required: number | null;
  total_equity: number | null;
  total_profit: number | null;
  ltv: number | null;
  interest_rate: number | null;
  exit_cap_rate: number | null;
};

type DealLike = {
  price?: string | number | null;
  assumptions_snapshot?: Record<string, unknown> | null;
} | null | undefined;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    if (v.toLowerCase() === "n/a") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const irrPassthrough = (v: unknown): number | string | null => {
  if (typeof v === "string" && v.toLowerCase() === "n/a") return "n/a";
  return num(v);
};

export function normalizeResults(
  raw: Record<string, unknown> | null | undefined,
  deal?: DealLike,
): NormalizedResults {
  const r = raw ?? {};
  const a = (deal?.assumptions_snapshot ?? {}) as Record<string, unknown>;
  const monthlyCfLegacy = num(r.monthly_cash_flow);

  const totalEquity =
    num(r.total_equity) ?? num(r.equity_required) ?? num(r.down_payment);

  return {
    levered_irr: irrPassthrough(r.levered_irr ?? r.irr),
    moic: num(r.moic),
    lp_moic: num(r.lp_moic),
    avg_coc: num(r.avg_coc ?? r.coc),
    coc_year1: num(r.coc_year1 ?? r.coc),
    noi: num(r.noi_stabilized ?? r.noi),
    cfbt_year1:
      num(r.cfbt_year1) ??
      (monthlyCfLegacy != null ? monthlyCfLegacy * 12 : null),
    dscr: num(r.dscr),
    cap_rate: num(r.cap_rate_going_in ?? r.cap_rate),
    acquisition_price: num(r.acquisition_price) ?? num(deal?.price),
    loan_amount: num(r.loan_amount),
    equity_required: num(r.equity_required ?? r.down_payment),
    total_equity: totalEquity,
    total_profit: num(r.total_profit),
    ltv: num(r.ltv) ?? num(a.ltv) ?? 0.7,
    interest_rate: num(r.interest_rate) ?? num(a.intRate) ?? 0.065,
    // CRITICAL: exit_cap_rate must come from results or assumptions_snapshot.exit_cap_rate.
    // Never fall back to entry cap (cap_rate_going_in / cap_rate) — that was a bug
    // showing 1.3% (entry) instead of 7% (exit).
    exit_cap_rate: num(r.exit_cap_rate) ?? num(a.exit_cap_rate) ?? null,
  };
}
