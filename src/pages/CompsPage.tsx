import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { format } from "date-fns";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, ZoomControl } from "react-leaflet";
import TopNav from "@/components/TopNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Expand, X, ZoomIn, ZoomOut, Locate } from "lucide-react";
import { supabaseGetComps, type RentcastComp } from "@/lib/supabase";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const SB_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://knimxvcbrtkuhsuovasu.supabase.co";
const SB_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaW14dmNicnRrdWhzdW92YXN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDEyNjAsImV4cCI6MjA4OTE3NzI2MH0.g3Gcz-c41C9jnxy5Gba_jzrV1ATjy5_Wr5yaIXOHY8M";
const H: Record<string, string> = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
};

interface DealRow {
  id: string;
  search_id: string;
  address: string;
  short_address: string;
  price: string;
  sqft: string;
  total_units: string;
  radius: string;
  deal_stage: string;
  comp_summary: Record<string, unknown> | null;
  created_at: string;
}

const starIcon = L.divIcon({
  html: `<div style="font-size:18px;line-height:1;text-align:center">⭐</div>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function getCentroid(comps: RentcastComp[]): [number, number] {
  const valid = comps.filter((c) => c.latitude != null && c.longitude != null);
  if (valid.length === 0) return [39.8283, -98.5795];
  return [
    valid.reduce((s, c) => s + Number(c.latitude), 0) / valid.length,
    valid.reduce((s, c) => s + Number(c.longitude), 0) / valid.length,
  ];
}

function getBounds(comps: RentcastComp[]) {
  const valid = comps.filter((c) => c.latitude != null && c.longitude != null);
  if (valid.length === 0) return undefined;
  return L.latLngBounds(valid.map((c) => [Number(c.latitude), Number(c.longitude)]));
}

function circleRadius(price: number | null) {
  if (!price) return 5;
  if (price < 1000) return 5;
  if (price < 2000) return 7;
  if (price < 3000) return 9;
  return 11;
}

function CompPopup({ comp }: { comp: RentcastComp }) {
  return (
    <div className="text-xs space-y-1 min-w-[200px]">
      <p className="font-semibold font-mono">{comp.formatted_address}</p>
      <p className="text-[11px] text-muted-foreground font-mono">ID: {comp.comp_id ?? comp.id}</p>
      <p>
        ${comp.price?.toLocaleString()}/mo · {comp.bedrooms}bd {comp.bathrooms}ba · {comp.square_footage?.toLocaleString()} sqft
      </p>
      <p className="text-muted-foreground">
        {comp.listing_status} · {comp.days_on_market ?? "—"} days · {comp.distance_km?.toFixed(2)} km
      </p>
      {comp.rank != null && (
        <p className="text-muted-foreground">Rank: #{comp.rank}</p>
      )}
    </div>
  );
}

function HoverableCircleMarker({ comp }: { comp: RentcastComp }) {
  const markerRef = useRef<L.CircleMarker>(null);

  return (
    <CircleMarker
      ref={markerRef}
      center={[Number(comp.latitude), Number(comp.longitude)]}
      radius={circleRadius(comp.price)}
      pathOptions={{ color: "hsl(217,91%,60%)", fillColor: "hsl(217,91%,60%)", fillOpacity: 0.65, weight: 1.5 }}
      eventHandlers={{
        mouseover: () => markerRef.current?.openPopup(),
        mouseout: () => markerRef.current?.closePopup(),
      }}
    >
      <Popup><CompPopup comp={comp} /></Popup>
    </CircleMarker>
  );
}

// Lazy-render wrapper using IntersectionObserver
function LazyMap({ dealId, comps, dealAddress, onExpand }: {
  dealId: string;
  comps: RentcastComp[];
  dealAddress: string;
  onExpand: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const centroid = getCentroid(comps);
  const bounds = getBounds(comps);

  return (
    <div ref={ref} className="relative h-[280px] rounded-lg overflow-hidden border border-border">
      {visible && comps.length > 0 ? (
        <MapContainer
          key={dealId}
          bounds={bounds}
          boundsOptions={{ padding: [30, 30] }}
          center={centroid}
          zoom={13}
          scrollWheelZoom={false}
          zoomControl={false}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <ZoomControl position="topleft" />
          <TileLayer url={TILE_URL} />
          <Marker position={centroid} icon={starIcon}>
            <Popup><span className="text-xs font-semibold">{dealAddress}</span></Popup>
          </Marker>
          {comps.map((c) =>
            c.latitude != null && c.longitude != null ? (
              <HoverableCircleMarker key={c.id} comp={c} />
            ) : null
          )}
        </MapContainer>
      ) : comps.length === 0 ? (
        <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
          No comp data for this search
        </div>
      ) : (
        <div className="flex items-center justify-center h-full bg-muted">
          <Skeleton className="w-full h-full" />
        </div>
      )}
      {comps.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-2 right-2 z-[1000] text-xs gap-1 shadow"
          onClick={onExpand}
        >
          <Expand className="h-3 w-3" /> Expand Map
        </Button>
      )}
    </div>
  );
}

// Full-screen map modal
function FullMapModal({ open, onClose, deal, comps }: {
  open: boolean;
  onClose: () => void;
  deal: DealRow;
  comps: RentcastComp[];
}) {
  const [bedFilter, setBedFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.CircleMarker>>({});
  const [activeCompId, setActiveCompId] = useState<string | null>(null);

  const filtered = useMemo(() => comps.filter((c) => {
    if (bedFilter !== "all") {
      const b = bedFilter === "3+" ? 3 : Number(bedFilter);
      if (bedFilter === "3+" ? (c.bedrooms ?? 0) < 3 : c.bedrooms !== b) return false;
    }
    if (statusFilter !== "all" && c.listing_status?.toLowerCase() !== statusFilter) return false;
    return true;
  }), [comps, bedFilter, statusFilter]);

  const centroid = getCentroid(comps);
  const bounds = getBounds(filtered.length > 0 ? filtered : comps);

  const panToComp = useCallback((comp: RentcastComp) => {
    if (mapRef && comp.latitude != null && comp.longitude != null) {
      mapRef.flyTo([Number(comp.latitude), Number(comp.longitude)], 17, { duration: 0.8 });
      setActiveCompId(comp.id);
      // Open the popup after flying
      setTimeout(() => {
        const marker = markerRefs.current[comp.id];
        if (marker) marker.openPopup();
      }, 900);
    }
  }, [mapRef]);

  const resetView = useCallback(() => {
    if (mapRef && bounds) {
      mapRef.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });
      setActiveCompId(null);
    }
  }, [mapRef, bounds]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden z-[9999]">
        <DialogTitle className="sr-only">Map: {deal.short_address || deal.address}</DialogTitle>
        {/* Filters */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border flex-wrap bg-background">
          <span className="text-xs font-medium text-muted-foreground mr-1">Beds:</span>
          {["all", "0", "1", "2", "3+"].map((v) => (
            <button
              key={v}
              onClick={() => setBedFilter(v)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${bedFilter === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {v === "all" ? "All" : v === "0" ? "Studio" : `${v}bd`}
            </button>
          ))}
          <span className="text-xs font-medium text-muted-foreground ml-3 mr-1">Status:</span>
          {["all", "active", "inactive"].map((v) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {v === "all" ? "All" : v}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetView} title="Reset view">
              <Locate className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => mapRef?.zoomIn()} title="Zoom in">
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => mapRef?.zoomOut()} title="Zoom out">
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button onClick={onClose} className="ml-1 p-1 rounded hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(90vh - 44px)" }}>
          {/* Sidebar */}
          <div className="w-[280px] border-r border-border overflow-y-auto shrink-0 hidden md:block bg-background">
            <div className="p-3 text-xs font-semibold text-muted-foreground border-b border-border sticky top-0 bg-background z-10">
              {filtered.length} comps
            </div>
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => panToComp(c)}
                className={`w-full text-left px-3 py-2 border-b border-border transition-colors ${
                  activeCompId === c.id ? "bg-accent" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                    {c.rank ?? "—"}
                  </span>
                  <span className="text-xs font-medium truncate">{c.formatted_address}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 pl-7">
                  ${c.price?.toLocaleString()}/mo · {c.bedrooms}bd {c.bathrooms}ba
                </div>
              </button>
            ))}
          </div>
          {/* Map */}
          <div className="flex-1 relative">
            <MapContainer
              key={`modal-${deal.id}-${bedFilter}-${statusFilter}`}
              bounds={bounds}
              boundsOptions={{ padding: [40, 40] }}
              center={centroid}
              zoom={13}
              scrollWheelZoom={true}
              zoomControl={false}
              doubleClickZoom={true}
              zoomSnap={0.5}
              zoomDelta={0.5}
              style={{ height: "100%", width: "100%" }}
              attributionControl={false}
              ref={setMapRef}
            >
              <ZoomControl position="topleft" />
              <TileLayer url={TILE_URL} />
              <Marker position={centroid} icon={starIcon}>
                <Popup><span className="text-xs font-semibold">{deal.short_address || deal.address}</span></Popup>
              </Marker>
              {filtered.map((c) =>
                c.latitude != null && c.longitude != null ? (
                  <CircleMarker
                    key={c.id}
                    ref={(el) => { if (el) markerRefs.current[c.id] = el; }}
                    center={[Number(c.latitude), Number(c.longitude)]}
                    radius={circleRadius(c.price)}
                    pathOptions={{
                      color: activeCompId === c.id ? "hsl(0,80%,55%)" : "hsl(217,91%,60%)",
                      fillColor: activeCompId === c.id ? "hsl(0,80%,55%)" : "hsl(217,91%,60%)",
                      fillOpacity: 0.65,
                      weight: activeCompId === c.id ? 3 : 1.5,
                    }}
                    eventHandlers={{
                      mouseover: (e) => e.target.openPopup(),
                      mouseout: (e) => { if (activeCompId !== c.id) e.target.closePopup(); },
                      click: () => { setActiveCompId(c.id); },
                    }}
                  >
                    <Popup><CompPopup comp={c} /></Popup>
                  </CircleMarker>
                ) : null
              )}
            </MapContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DealCard({ deal, comps }: { deal: DealRow; comps: RentcastComp[] }) {
  const [expanded, setExpanded] = useState(false);
  const displayAddr = deal.short_address || deal.address;
  const dateStr = deal.created_at ? format(new Date(deal.created_at), "MMM d, yyyy") : "";

  const bedBreakdown: string[] = [];
  if (deal.comp_summary && typeof deal.comp_summary === "object") {
    const cs = deal.comp_summary as Record<string, unknown>;
    Object.keys(cs).sort().forEach((k) => {
      const match = k.match(/^(\d+)bd/);
      if (match) bedBreakdown.push(`${match[1]}bd: ${typeof cs[k] === "object" && cs[k] && "count" in (cs[k] as Record<string, unknown>) ? (cs[k] as Record<string, unknown>).count : "—"}`);
    });
  }

  return (
    <>
      <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-foreground truncate">{displayAddr}</h3>
            <p className="text-xs font-mono text-muted-foreground">{deal.search_id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {dateStr && <Badge variant="secondary" className="text-[10px]">{dateStr}</Badge>}
            {deal.total_units && <Badge variant="secondary" className="text-[10px]">{deal.total_units} units</Badge>}
            {deal.radius && <Badge variant="secondary" className="text-[10px]">{deal.radius} mi</Badge>}
            <Badge className="bg-accent/15 text-accent border-0 text-[10px] font-medium">
              <MapPin className="h-3 w-3 mr-0.5" /> {comps.length} comps
            </Badge>
          </div>
          {bedBreakdown.length > 0 && (
            <div className="flex gap-2 text-[11px] text-muted-foreground">
              {bedBreakdown.map((b) => <span key={b}>{b}</span>)}
            </div>
          )}
          <LazyMap
            dealId={deal.id}
            comps={comps}
            dealAddress={displayAddr}
            onExpand={() => setExpanded(true)}
          />
        </CardContent>
      </Card>
      {expanded && (
        <FullMapModal open={expanded} onClose={() => setExpanded(false)} deal={deal} comps={comps} />
      )}
    </>
  );
}

export default function CompsPage() {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [compsByDeal, setCompsByDeal] = useState<Record<string, RentcastComp[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiKey = localStorage.getItem("ping_api_key") ?? "";
    if (!apiKey) { setLoading(false); return; }

    (async () => {
      try {
        const res = await fetch(
          `${SB_URL}/rest/v1/deals?api_key=eq.${encodeURIComponent(apiKey)}&archived=eq.false&status=eq.complete&select=id,search_id,address,short_address,price,sqft,total_units,radius,deal_stage,comp_summary,created_at&order=created_at.desc`,
          { headers: H }
        );
        if (!res.ok) throw new Error("Failed to fetch deals");
        const rows: DealRow[] = await res.json();
        setDeals(rows);

        const allComps = await supabaseGetComps(rows.map((d) => d.id));
        const grouped = allComps.reduce<Record<string, RentcastComp[]>>((acc, c) => {
          (acc[c.deal_id] ??= []).push(c);
          return acc;
        }, {});
        setCompsByDeal(grouped);
      } catch (e) {
        console.error("CompsPage fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Comp Map Catalog</h1>
          <p className="text-sm text-muted-foreground">Every RentCast search you've run, mapped.</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="rounded-xl">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-[280px] w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No complete searches found.</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Run a search in the Analyst tool to see your comps here.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} comps={compsByDeal[deal.id] ?? []} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
