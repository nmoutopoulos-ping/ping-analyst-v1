import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Download, Calendar, Archive, Loader2, MapPin, RefreshCw, ChevronUp, FileDown } from "lucide-react";
import { getApiKey } from "@/lib/api";
import { supabaseGetDeal, supabaseArchiveDeal, supabaseUpdateDealStage, supabaseCreateSignedUrl } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Deal } from "@/lib/types";
import { fmtPct, fmtMoney, fmtRatio } from "@/lib/formatters";
import { normalizeResults } from "@/lib/normalizeResults";
import DealPhotoGallery from "@/components/DealPhotoGallery";
import { ErrorBoundary } from "@/components/ErrorBoundary";
const API_BASE = import.meta.env.VITE_API_URL || "https://analyst-docker.onrender.com";

function fmt(val: number | string | undefined | null, type: "pct" | "mult" | "usd" | "num") {
  if (val == null) return "--";
  if (typeof val === "string") return val;
  if (type === "pct") return (val * 100).toFixed(1) + "%";
  if (type === "mult") return val.toFixed(1) + "x";
  if (type === "usd") return "$" + val.toLocaleString();
  return val.toLocaleString();
}

const STAGES = ["New", "Review", "Offer", "Contract", "Closed", "Pass"];

interface VersionResults {
  levered_irr: number | string | null;
  moic: number | string | null;
  avg_coc: number | string | null;
  noi_stabilized: number | null;
  cfbt_year1: number | null;
  dscr: number | string | null;
  coc_year1: number | string | null;
  cap_rate_going_in: number | string | null;
  acquisition_price: number | null;
  loan_amount: number | null;
  equity_required: number | null;
  ltv: number | null;
  interest_rate: number | null;
  exit_cap_rate: number | null;
}

interface DealVersion {
  id: string;
  deal_id: string;
  parent_version_id: string | null;
  label: string;
  version_number: number;
  workbook_path: string;
  assumption_overrides: Record<string, unknown>;
  results: VersionResults;
  status: string;
  created_at: string;
}

async function fetchVersions(searchId: string): Promise<DealVersion[]> {
  const key = getApiKey();
  const res = await fetch(`${API_BASE}/deals/${searchId}/versions`, {
    headers: { "X-Api-Key": key || "" },
  });
  if (!res.ok) throw new Error(`Failed to fetch versions: ${res.status}`);
  const data = await res.json();
  return data.versions ?? [];
}

async function postRerun(
  searchId: string,
  body: { label: string; parent_version_id: string | null; overrides: Record<string, number> }
): Promise<DealVersion> {
  const key = getApiKey();
  const res = await fetch(`${API_BASE}/deals/${searchId}/rerun`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": key || "" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Rerun failed: ${res.status}`);
  }
  const data = await res.json();
  if (data && typeof data === "object" && "version" in data) {
    return data.version as DealVersion;
  }
  return data as DealVersion;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function DealDetailPageInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const { toast } = useToast();

  // Versions
  const { data: versions = [], isLoading: versionsLoading, isError: versionsError, error: versionsErrorObj, refetch: refetchVersions } = useQuery({
    queryKey: ["deal-versions", id],
    queryFn: () => fetchVersions(id!),
    enabled: !!id,
    retry: 1,
  });

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  // Auto-select base version when versions load
  useEffect(() => {
    if (versions.length > 0 && !selectedVersionId) {
      const base = versions.find((v) => v.version_number === 0);
      setSelectedVersionId(base?.id ?? versions[0].id);
    }
  }, [versions, selectedVersionId]);

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? null;

  // Rerun form state
  const [parentVersionId, setParentVersionId] = useState<string | null>(null);
  const [rerunLabel, setRerunLabel] = useState("");
  const [rerunAcquisitionPrice, setRerunAcquisitionPrice] = useState<string>("");
  const [rerunLtv, setRerunLtv] = useState<string>("");
  const [rerunInterestRate, setRerunInterestRate] = useState<string>("");
  const [rerunExitCapRate, setRerunExitCapRate] = useState<string>("");
  const [rerunning, setRerunning] = useState(false);

  const parentVersion = versions.find((v) => v.id === parentVersionId) ?? versions.find((v) => v.version_number === 0) ?? null;

  // Cascade: selected version → base version → deal.results, normalized
  const preFillSource = useMemo(() => {
    const raw =
      parentVersion?.results ??
      versions.find((v) => v.version_number === 0)?.results ??
      versions[0]?.results ??
      (deal?.results as Record<string, unknown> | undefined) ??
      null;
    return normalizeResults(raw as Record<string, unknown> | null, deal as any);
  }, [parentVersion, versions, deal]);

  // Pre-fill from preFillSource when it changes
  useEffect(() => {
    setRerunAcquisitionPrice(
      preFillSource.acquisition_price != null
        ? String(preFillSource.acquisition_price)
        : "",
    );
    setRerunLtv(
      preFillSource.ltv != null
        ? String(+(preFillSource.ltv * 100).toFixed(2))
        : "",
    );
    setRerunInterestRate(
      preFillSource.interest_rate != null
        ? String(+(preFillSource.interest_rate * 100).toFixed(2))
        : "",
    );
    setRerunExitCapRate(
      preFillSource.exit_cap_rate != null
        ? String(+(preFillSource.exit_cap_rate * 100).toFixed(2))
        : "",
    );
  }, [parentVersion?.id, preFillSource]);

  const handleRerun = async () => {
    if (!id || !rerunLabel.trim()) {
      toast({ title: "Label required", description: "Enter a name for this version.", variant: "destructive" });
      return;
    }
    setRerunning(true);
    try {
      const overrides: Record<string, number> = {};
      const p = preFillSource;

      const acqVal = parseFloat(rerunAcquisitionPrice);
      if (!isNaN(acqVal) && p.acquisition_price != null && acqVal !== p.acquisition_price)
        overrides.acquisition_price = acqVal;

      const ltvVal = parseFloat(rerunLtv) / 100;
      if (!isNaN(ltvVal) && p.ltv != null && Math.abs(ltvVal - p.ltv) > 0.0001)
        overrides.ltv = ltvVal;

      const irVal = parseFloat(rerunInterestRate) / 100;
      if (!isNaN(irVal) && p.interest_rate != null && Math.abs(irVal - p.interest_rate) > 0.0001)
        overrides.interest_rate = irVal;

      const ecVal = parseFloat(rerunExitCapRate) / 100;
      if (!isNaN(ecVal) && p.exit_cap_rate != null && Math.abs(ecVal - p.exit_cap_rate) > 0.0001)
        overrides.exit_cap_rate = ecVal;

      const newVersion = await postRerun(id, {
        label: rerunLabel.trim(),
        parent_version_id: parentVersion?.version_number === 0 ? null : parentVersion?.id ?? null,
        overrides,
      });
      await queryClient.invalidateQueries({ queryKey: ["deal-versions", id] });
      setSelectedVersionId(newVersion.id);
      setRerunLabel("");
      toast({ title: "Version created", description: `Created version: ${newVersion.label}` });
    } catch (err: any) {
      toast({ title: "Rerun failed", description: err.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setRerunning(false);
    }
  };

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
  const nSelected = normalizeResults(
    (selectedVersion?.results ?? deal?.results) as Record<string, unknown> | null,
    deal as any,
  );
  const c = deal.comp_summary;

  // Sorted versions: base first, then newest first
  const sortedVersions = [...versions].sort((a, b) => {
    if (a.version_number === 0) return -1;
    if (b.version_number === 0) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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

        {/* Metric cards — show selected version metrics */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: "Avg COC", value: fmt(nSelected.avg_coc, "pct") },
            { label: "MOIC", value: fmt(nSelected.moic, "mult") },
            { label: "IRR", value: fmt(nSelected.levered_irr, "pct") },
            { label: "Cap Rate", value: fmt(nSelected.cap_rate, "pct") },
            { label: "NOI", value: fmt(nSelected.noi, "usd") },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="label-uppercase">{item.label}</div>
              <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Rerun & Versions Section */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Rerun panel */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Rerun this deal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rerun-label">Version Label</Label>
                <Input
                  id="rerun-label"
                  placeholder="e.g. Stress test, Aggressive, Base"
                  value={rerunLabel}
                  onChange={(e) => setRerunLabel(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="parent-version">Parent Version</Label>
                <select
                  id="parent-version"
                  value={parentVersionId ?? parentVersion?.id ?? ""}
                  onChange={(e) => setParentVersionId(e.target.value || null)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} (v{v.version_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rerun-acq">Acquisition Price ($)</Label>
                  <Input
                    id="rerun-acq"
                    type="number"
                    step={50000}
                    value={rerunAcquisitionPrice}
                    onChange={(e) => setRerunAcquisitionPrice(e.target.value)}
                  />
                  {preFillSource?.acquisition_price != null &&
                    parseFloat(rerunAcquisitionPrice) !== preFillSource.acquisition_price && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Base: {fmtMoney(preFillSource.acquisition_price)}
                      </p>
                    )}
                </div>
                <div>
                  <Label htmlFor="rerun-ltv">LTV (%)</Label>
                  <Input
                    id="rerun-ltv"
                    type="number"
                    step={1}
                    min={0}
                    max={95}
                    value={rerunLtv}
                    onChange={(e) => setRerunLtv(e.target.value)}
                  />
                  {preFillSource?.ltv != null &&
                    Math.abs(parseFloat(rerunLtv) - (preFillSource.ltv as number) * 100) > 0.01 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Base: {fmtPct(preFillSource.ltv)}
                      </p>
                    )}
                </div>
                <div>
                  <Label htmlFor="rerun-ir">Interest Rate (%)</Label>
                  <Input
                    id="rerun-ir"
                    type="number"
                    step={0.05}
                    min={0}
                    max={15}
                    value={rerunInterestRate}
                    onChange={(e) => setRerunInterestRate(e.target.value)}
                  />
                  {preFillSource?.interest_rate != null &&
                    Math.abs(parseFloat(rerunInterestRate) - (preFillSource.interest_rate as number) * 100) > 0.01 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Base: {fmtPct(preFillSource.interest_rate)}
                      </p>
                    )}
                </div>
                <div>
                  <Label htmlFor="rerun-ec">Exit Cap Rate (%)</Label>
                  <Input
                    id="rerun-ec"
                    type="number"
                    step={0.05}
                    min={0}
                    max={15}
                    value={rerunExitCapRate}
                    onChange={(e) => setRerunExitCapRate(e.target.value)}
                  />
                  {preFillSource?.exit_cap_rate != null &&
                    Math.abs(parseFloat(rerunExitCapRate) - (preFillSource.exit_cap_rate as number) * 100) > 0.01 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Base: {fmtPct(preFillSource.exit_cap_rate)}
                      </p>
                    )}
                </div>
              </div>

              <Button onClick={handleRerun} disabled={rerunning} className="w-full">
                {rerunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recalculating workbook…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Rerun
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Right — Versions list */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Versions</CardTitle>
            </CardHeader>
            <CardContent>
              {versionsError ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Couldn't load versions. {(versionsErrorObj as Error)?.message}</p>
                  <Button variant="outline" size="sm" onClick={() => refetchVersions()}>Retry</Button>
                </div>
              ) : versionsLoading ? (
                <p className="text-sm text-muted-foreground">Loading versions…</p>
              ) : sortedVersions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">No saved versions yet. Run the deal to create the first version.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {sortedVersions.map((v) => {
                    const isSelected = v.id === selectedVersionId;
                    const nv = normalizeResults(v.results as Record<string, unknown> | null);
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVersionId(v.id)}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{v.label}</span>
                            {v.version_number === 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Base</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <a
                              href={`${API_BASE}/deals/${id}/versions/${v.id}/download?api_key=${encodeURIComponent(getApiKey() ?? "")}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded hover:bg-muted transition-colors"
                              title="Download .xlsx"
                            >
                              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                            {v.version_number !== 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setParentVersionId(v.id);
                                }}
                                className="p-1 rounded hover:bg-muted transition-colors"
                                title="Use as parent"
                              >
                                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-1.5">{timeAgo(v.created_at)}</p>
                        {vr && (
                          <div className="flex gap-3 text-[11px] text-muted-foreground">
                            <span>IRR {fmt(vr.levered_irr, "pct")}</span>
                            <span>MOIC {fmt(vr.moic, "mult")}</span>
                            <span>DSCR {fmtRatio(vr.dscr)}</span>
                            <span>CoC {fmt(vr.coc_year1, "pct")}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
            {(nSelected.cap_rate != null || nSelected.levered_irr != null || nSelected.moic != null) && (
              <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Financial Results</h3>
                  {selectedVersion && (
                    <Badge variant="outline" className="text-xs">
                      {selectedVersion.label} (v{selectedVersion.version_number})
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  {[
                    ["Cap Rate", fmt(nSelected.cap_rate, "pct")],
                    ["NOI", fmt(nSelected.noi, "usd")],
                    ["Levered IRR", fmt(nSelected.levered_irr, "pct")],
                    ["MOIC", fmt(nSelected.moic, "mult")],
                    ["Loan Amount", fmt(nSelected.loan_amount, "usd")],
                    ["DSCR", fmtRatio(nSelected.dscr)],
                    ["Equity Required", fmt(nSelected.equity_required, "usd")],
                    ["CoC Year 1", fmt(nSelected.coc_year1, "pct")],
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

export default function DealDetailPage() {
  return (
    <ErrorBoundary>
      <DealDetailPageInner />
    </ErrorBoundary>
  );
}
