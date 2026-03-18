import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Settings, MapPin } from "lucide-react";
import { apiGet } from "@/lib/api";
import { Deal } from "@/lib/types";
import TopNav from "@/components/TopNav";
import StageBadge from "@/components/StageBadge";

const COLUMNS = [
  { key: "New", label: "New", stages: ["New"] },
  { key: "Active", label: "Active", stages: ["Active", "Review"] },
  { key: "Under Review", label: "Under Review", stages: ["Under Review", "Offer", "Contract"] },
  { key: "Closed", label: "Closed", stages: ["Closed", "Pass"] },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatPrice(n?: number) {
  if (!n) return "—";
  return "$" + n.toLocaleString();
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    apiGet<{ ok: boolean; deals: Deal[] }>("/deals")
      .then((res) => setDeals(res.deals || []))
      .catch(() => setError("Failed to load deals."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = deals.filter(
    (d) =>
      d.address.toLowerCase().includes(search.toLowerCase()) ||
      d.search_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground">Deals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All submitted analyses stored and secure.
        </p>

        <div className="mt-6 flex items-center rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <Search className="mr-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by address or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>

        {loading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

        {!loading && !error && (
          <div className="mt-8 grid grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colDeals = filtered.filter((d) => col.stages.includes(d.stage));
              return (
                <div key={col.key}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent/20 px-1.5 text-xs font-semibold text-accent">
                      {colDeals.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {colDeals.length === 0 ? (
                      <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted-foreground">
                        No deals
                      </div>
                    ) : (
                      colDeals.map((deal) => (
                        <button
                          key={deal.search_id}
                          onClick={() => navigate(`/deals/${deal.search_id}`)}
                          className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-shadow duration-150 hover:shadow-md"
                        >
                          <div className="label-uppercase text-accent">SEARCH ID</div>
                          <p className="font-mono text-sm font-semibold text-foreground">
                            {deal.search_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(deal.created_at)}
                          </p>

                          <div className="mt-3 flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                            <div>
                              <div className="label-uppercase">Property</div>
                              <p className="text-sm text-foreground">{deal.short_address || deal.address}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex gap-6">
                            <div>
                              <div className="label-uppercase">Units</div>
                              <p className="text-sm font-medium text-foreground">
                                {deal.search_meta?.total_units ?? "—"}
                              </p>
                            </div>
                            <div>
                              <div className="label-uppercase">$ Price</div>
                              <p className="text-sm font-medium text-foreground">
                                {formatPrice(deal.search_meta?.price || deal.search_meta?.listing_price)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="label-uppercase">Status</div>
                            <StageBadge stage={deal.stage} className="mt-1" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
