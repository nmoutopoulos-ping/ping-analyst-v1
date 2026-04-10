import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Download, Calendar, Archive, Loader2, MapPin } from "lucide-react";
import { getApiKey } from "@/lib/api";
import { supabaseGetDeal, supabaseArchiveDeal, supabaseUpdateDealStage, supabaseCreateSignedUrl } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Deal } from "@/lib/types";
import DealPhotoGallery from "@/components/DealPhotoGallery";


function fmt(val: number | undefined | null, type: "pct" | "mult" | "usd" | "num") {
  if (val == null) return "--";
  if (type === "pct") return (val * 100).toFixed(1) + "%";
  if (type === "mult") return val.toFixed(1) + "x";
  if (type === "usd") return "$" + val.toLocaleString();
  return val.toLocaleString();
}

const STAGES = ["New", "Review", "Offer", "Contract", "Closed", "Pass"];

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabaseGetDeal(id!, getApiKey()!)
      .then((deal) => {
        if (deal) setDeal(deal);
        else setError("Deal not found.");
      })
      .catch(() => setError("Failed to load deal."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStageChange = async (newStage: string) => {
    if (!deal) return;
    setSaving(true);
    try {
      await supabaseUpdateDealStage(deal.search_id, newStage);
      setDeal({ ...deal, stage: newStage });
      toast({ title: "Stage updated", description: `Deal moved to ${newStage}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update stage.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-8 text-sm text-muted-foreground">Loading...</p>;
  if (error || !deal) return <p className="p-8 text-sm text-destructive">{error}</p>;

  const r = deal.results;
  const c = deal.comp_summary;

  return (
    <div className="max-w-6xl px-6 py-8">
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
        <div className="mt-6 grid grid-cols-5 gap-4">
          {[
            { label: "Avg COC", value: fmt(r?.coc, "pct") },
            { label: "MOIC", value: fmt(r?.moic, "mult") },
            { label: "IRR", value: fmt(r?.irr, "pct") },
            { label: "Cap Rate", value: fmt(r?.cap_rate, "pct") },
            { label: "NOI", value: fmt(r?.noi, "usd") },
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
                  ["Total Units", deal.total_units ?? "--"],
                  ["Price", fmt(Number(deal.price) || undefined, "usd")],
                  ["Improvements", fmt(Number(deal.cost) || undefined, "usd")],
                  ["Building SQFT", fmt(Number(deal.sqft) || undefined, "num")],
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
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Comp Summary</h3>
                  <Link
                    to="/comps"
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <MapPin className="h-3 w-3" /> View Comp Map
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-sm mb-4">
                  <div>
                    <span className="label-uppercase">Total Comps</span>
                    <p className="mt-0.5 text-foreground">{c?.reduce((s, e) => s + e.count, 0) ?? 0}</p>
                  </div>
                  <div>
                    <span className="label-uppercase">Radius</span>
                    <p className="mt-0.5 text-foreground">{deal.radius ? `${deal.radius} mi` : "--"}</p>
                  </div>
                </div>
                {c && c.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground">
                          <th className="text-left px-3 py-2 font-medium">Unit Type</th>
                          <th className="text-right px-3 py-2 font-medium">Units</th>
                          <th className="text-right px-3 py-2 font-medium">Comps</th>
                          <th className="text-right px-3 py-2 font-medium">Avg Rent</th>
                          <th className="text-right px-3 py-2 font-medium">Avg Sqft</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.map((entry, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 font-medium text-foreground">{entry.beds}bd / {entry.baths}ba</td>
                            <td className="px-3 py-2 text-right text-foreground">{entry.units}</td>
                            <td className="px-3 py-2 text-right text-foreground">{entry.count}</td>
                            <td className="px-3 py-2 text-right text-foreground">${entry.avg_rent?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            <td className="px-3 py-2 text-right text-foreground">{entry.avg_sqft?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

            {/* Assumptions */}
            {deal.assumptions_snapshot && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                  Assumptions{deal.preset_name ? ` -- ${deal.preset_name}` : ""}
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {[
                    ["LTV", fmt(deal.assumptions_snapshot.ltv, "pct")],
                    ["Vacancy Rate", fmt(deal.assumptions_snapshot.vacancy, "pct")],
                    ["Interest Rate", fmt(deal.assumptions_snapshot.intRate, "pct")],
                    ["Closing Cost %", fmt(deal.assumptions_snapshot.closingPct, "pct")],
                    ["Operating Expense %", fmt(deal.assumptions_snapshot.opexRatio, "pct")],
                    ["Year 1 Rent Growth", fmt(deal.assumptions_snapshot.rentGrowth1, "pct")],
                    ["Other Monthly Income", fmt(deal.assumptions_snapshot.otherIncMo, "usd")],
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
                    ["DSCR", r.dscr?.toFixed(2) ?? "--"],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <span className="label-uppercase">{label}</span>
                      <p className="mt-0.5 text-foreground">{String(val)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

                      {/* Deal Photos */}
              <section className="rounded-xl border border-border bg-card p-6">
                <DealPhotoGallery dealId={id!} apiKey={getApiKey()} />
              </section>
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
              {saving && <p className="mt-2 text-xs text-muted-foreground">Saving...</p>}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    disabled={archiving}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Archive className="h-4 w-4" /> {archiving ? "Archiving..." : "Archive Deal"}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive this deal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      It will be hidden from your board.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        setArchiving(true);
                        try {
                          await supabaseArchiveDeal(deal.search_id);
                          navigate("/deals");
                        } catch {
                          setArchiving(false);
                        }
                      }}
                    >
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Downloads</h3>
              <div className="space-y-2">
                {(deal.excel_data || deal.excel_path) ? (
                  <button
                    disabled={downloadingExcel}
                    onClick={async () => {
                      const filename = deal.excel_path?.split("/").pop() || `${deal.search_id}.xlsx`;
                      if (deal.excel_data) {
                        const raw = atob(deal.excel_data as string);
                        const arr = new Uint8Array(raw.length);
                        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
                        const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } else if (deal.excel_path) {
                        setDownloadingExcel(true);
                        try {
                          const signedUrl = await supabaseCreateSignedUrl(`deal-files/${deal.excel_path}`);
                          window.open(signedUrl, "_blank");
                        } catch {
                          toast({ title: "Error", description: "Failed to download Excel file.", variant: "destructive" });
                        } finally {
                          setDownloadingExcel(false);
                        }
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    {downloadingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {downloadingExcel ? "Downloading..." : " Download Excel Report"}
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5 text-sm font-medium text-muted-foreground">
                    <Download className="h-4 w-4" /> Excel -- Not available
                  </div>
                )}
                {(deal.docx_data || deal.docx_path) ? (
                  <button
                    disabled={downloadingDocx}
                    onClick={async () => {
                      const filename = deal.docx_path?.split("/").pop() || `${deal.search_id}.docx`;
                      if (deal.docx_data) {
                        const raw = atob(deal.docx_data as string);
                        const arr = new Uint8Array(raw.length);
                        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
                        const blob = new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } else if (deal.docx_path) {
                        setDownloadingDocx(true);
                        try {
                          const signedUrl = await supabaseCreateSignedUrl(`deal-files/${deal.docx_path}`);
                          window.open(signedUrl, "_blank");
                        } catch {
                          toast({ title: "Error", description: "Failed to download Word file.", variant: "destructive" });
                        } finally {
                          setDownloadingDocx(false);
                        }
                      }
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    {downloadingDocx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {downloadingDocx ? "Downloading..." : " Download Word Report"}
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5 text-sm font-medium text-muted-foreground">
                    <Download className="h-4 w-4" /> Word -- Not available
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}