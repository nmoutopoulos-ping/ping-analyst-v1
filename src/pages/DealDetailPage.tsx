import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, MapPin, Calendar } from "lucide-react";
import { apiPatch, getApiKey, getDownloadUrl } from "@/lib/api";
import { supabaseGetDeal } from "@/lib/supabase";
import { Deal } from "@/lib/types";
import TopNav from "@/components/TopNav";
import StageBadge from "@/components/StageBadge";

function fmt(val: number | undefined | null, type: "pct" | "mult" | "usd" | "num") {
  if (val == null) return "—";
  if (type === "pct") return (val * 100).toFixed(1) + "%";
  if (type === "mult") return val.toFixed(1) + "x";
  if (type === "usd") return "$" + val.toLocaleString();
  return val.toLocaleString();
}

const STAGES = ["New", "Active", "Under Review", "Closed"];

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<{ ok: boolean; deal: Deal }>(`/deals/${id}`)
      .then((res) => {
        if (res.deal) setDeal(res.deal);
        else setError("Deal not found.");
      })
      .catch(() => setError("Failed to load deal."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStageChange = async (newStage: string) => {
    if (!deal) return;
    setSaving(true);
    try {
      await apiPatch(`/deals/${deal.search_id}/stage`, {
        api_key: getApiKey(),
        stage: newStage,
      });
      setDeal({ ...deal, stage: newStage });
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background"><TopNav /><p className="p-8 text-sm text-muted-foreground">Loading…</p></div>;
  if (error || !deal) return <div className="min-h-screen bg-background"><TopNav /><p className="p-8 text-sm text-destructive">{error}</p></div>;

  const r = deal.results;
  const m = deal.search_meta;
  const c = deal.comp_summary;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <button onClick={() => navigate("/deals")} className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Deals
        </button>

        <h1 className="text-2xl font-bold text-foreground">{deal.address}</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{deal.search_id}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Calendar className="h-3 w-3" />
          {new Date(deal.created_at).toLocaleString()}
        </p>

        {/* Metric cards */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { label: "Avg COC", value: fmt(r?.coc, "pct") },
            { label: "MOIC", value: fmt(r?.moic, "mult") },
            { label: "IRR", value: fmt(r?.irr, "pct") },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="label-uppercase">{item.label}</div>
              <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Property Details */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Property Details</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                {[
                  ["Date", new Date(deal.created_at).toLocaleDateString()],
                  ["Total Units", m?.total_units ?? "—"],
                  ["Price", fmt(m?.price || m?.listing_price, "usd")],
                  ["Improvements", fmt(m?.cost, "usd")],
                  ["Building SQFT", fmt(m?.sqft, "num")],
                  ["Submitted By", deal.email],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <span className="label-uppercase">{label}</span>
                    <p className="mt-0.5 text-foreground">{String(val)}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Comp Summary */}
            {c && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Comp Summary</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {[
                    ["Avg Rent/Unit", fmt(c.avg_rent, "usd")],
                    ["Avg SQFT", fmt(c.avg_sqft, "num")],
                    ["Total Comps", c.count],
                    ["Radius", m?.radius ? `${m.radius} mi` : "—"],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <span className="label-uppercase">{label}</span>
                      <p className="mt-0.5 text-foreground">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Financial Results */}
            {r && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Financial Results</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {[
                    ["Cap Rate", fmt(r.cap_rate, "pct")],
                    ["NOI", fmt(r.noi, "usd")],
                    ["Monthly Cash Flow", fmt(r.monthly_cash_flow, "usd")],
                    ["Loan Amount", fmt(r.loan_amount, "usd")],
                    ["Down Payment", fmt(r.down_payment, "usd")],
                    ["DSCR", r.dscr?.toFixed(2) ?? "—"],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <span className="label-uppercase">{label}</span>
                      <p className="mt-0.5 text-foreground">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Stage</h3>
              <select
                value={deal.stage}
                onChange={(e) => handleStageChange(e.target.value)}
                disabled={saving}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {saving && <p className="mt-2 text-xs text-muted-foreground">Saving…</p>}
              <div className="mt-3">
                <StageBadge stage={deal.stage} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Downloads</h3>
              <div className="space-y-2">
                <a
                  href={getDownloadUrl(deal.search_id, "excel")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald/10 px-4 py-2.5 text-sm font-medium text-emerald transition-colors hover:bg-emerald/20"
                >
                  <Download className="h-4 w-4" /> Excel Model
                </a>
                <a
                  href={getDownloadUrl(deal.search_id, "docx")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue/10 px-4 py-2.5 text-sm font-medium text-blue transition-colors hover:bg-blue/20"
                >
                  <Download className="h-4 w-4" /> Word Summary
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
