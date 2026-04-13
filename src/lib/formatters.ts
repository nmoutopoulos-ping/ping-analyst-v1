export const fmtPct = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return (v * 100).toFixed(2) + "%";
};

export const fmtMoney = (v: number | string | null | undefined): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
};

export const fmtRatio = (v: number | string | null | undefined, digits = 2): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return v.toFixed(digits);
};
