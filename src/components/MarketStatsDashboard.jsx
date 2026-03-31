/**
 * MarketStatsDashboard.jsx
 *
 * RentCast Market Intelligence Panel â CRM Integration Prototype
 *
 * HANDOFF NOTES FOR CLAUDE CODE:
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 * 1. CORS â WHY MOCK DATA IS ON:
 *    RentCast does not allow direct browser-to-API calls (no CORS headers).
 *    USE_MOCK_DATA is set to TRUE for the Lovable prototype so you can
 *    build and validate the UI without a backend.
 *
 *    TO GO LIVE, Claude Code needs to:
 *    a) Create a backend proxy route, e.g. GET /api/rentcast/markets
 *       that forwards to https://api.rentcast.io/v1/markets server-side
 *    b) Store the key in .env as RENTCAST_API_KEY (server-side only)
 *    c) Replace the two fetch() URLs below with your proxy routes
 *    d) Set USE_MOCK_DATA = false
 *
 * 2. INTEGRATION POINT: This component is self-contained. Drop it into
 *    any CRM record page (Property, Deal, Market) and pass in a default
 *    zipCode prop from the parent record.
 *
 * 3. MOCK DATA mirrors the exact RentCast /v1/markets response shape,
 *    so the UI is production-accurate even without live data.
 *
 * 4. DEPENDENCIES: Tailwind CSS (already in Lovable), lucide-react.
 *    Run: npm install lucide-react (likely already installed in Lovable)
 * âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
 */

import { useState, useEffect, useRef } from "react";
import {
  Search, RefreshCw, TrendingUp, Home, Clock,
  BarChart2, AlertCircle, Building2, ChevronDown
} from "lucide-react";

// âââ CONFIG ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// API key lives server-side on Render (RENTCAST_API_KEY env var).
// All requests go through the backend proxy to avoid CORS.
const BACKEND_URL = "https://analyst-ra00.onrender.com";
const USE_MOCK_DATA = false;
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const PROPERTY_TYPES = [
  { value: "Single Family", label: "Single family" },
  { value: "Multifamily", label: "Multifamily" },
  { value: "Condo", label: "Condo" },
  { value: "Townhouse", label: "Townhouse" },
];

// Mock data mirrors exact RentCast /v1/markets response shape
const MOCK_DATA = {
  zipCode: "78701",
  rentalData: {
    averageRent: 2340,
    minRent: 1100,
    maxRent: 5800,
    averageVacancy: 0.047,
    averageDaysOnMarket: 22,
    bedrooms_0: { averageRent: 1420, minRent: 1100, maxRent: 1900, averageDaysOnMarket: 18 },
    bedrooms_1: { averageRent: 1850, minRent: 1300, maxRent: 2600, averageDaysOnMarket: 21 },
    bedrooms_2: { averageRent: 2480, minRent: 1700, maxRent: 3400, averageDaysOnMarket: 24 },
    bedrooms_3: { averageRent: 3100, minRent: 2200, maxRent: 4200, averageDaysOnMarket: 28 },
    bedrooms_4: { averageRent: 4200, minRent: 3000, maxRent: 5800, averageDaysOnMarket: 35 },
  },
  saleData: {
    averagePrice: 618000,
    minPrice: 285000,
    maxPrice: 1450000,
    averageDaysOnMarket: 41,
  },
};

const MOCK_LISTINGS = [
  { formattedAddress: "412 W 6th St, Austin, TX 78701", bedrooms: 1, bathrooms: 1, squareFootage: 720, price: 1875 },
  { formattedAddress: "800 W 5th St #204, Austin, TX 78703", bedrooms: 2, bathrooms: 2, squareFootage: 1050, price: 2650 },
  { formattedAddress: "1122 Colorado St, Austin, TX 78701", bedrooms: 1, bathrooms: 1, squareFootage: 640, price: 1795 },
  { formattedAddress: "211 W Cesar Chavez St, Austin, TX 78701", bedrooms: 2, bathrooms: 1, squareFootage: 880, price: 2200 },
  { formattedAddress: "300 Bowie St #510, Austin, TX 78703", bedrooms: 3, bathrooms: 2, squareFootage: 1380, price: 3400 },
];

// âââ HELPERS âââââââââââââââââââââââââââââââââââââââââââââââââââââ
const fmt = (n) =>
  n == null || isNaN(n) ? "â" : "$" + Math.round(n).toLocaleString();

const fmtPct = (n) =>
  n == null || isNaN(n) ? "â" : (n * 100).toFixed(1) + "%";

const BED_TYPES = [
  { key: "bedrooms_0", label: "Studio", color: "bg-violet-100 text-violet-800" },
  { key: "bedrooms_1", label: "1 bed", color: "bg-emerald-100 text-emerald-800" },
  { key: "bedrooms_2", label: "2 bed", color: "bg-sky-100 text-sky-800" },
  { key: "bedrooms_3", label: "3 bed", color: "bg-amber-100 text-amber-800" },
  { key: "bedrooms_4", label: "4+ bed", color: "bg-rose-100 text-rose-800" },
];

// âââ SUB-COMPONENTS âââââââââââââââââââââââââââââââââââââââââââââââ

function MetricCard({ label, value, sub, icon: Icon, accent = "gray" }) {
  const accents = {
    blue:   "bg-sky-50 text-sky-600",
    green:  "bg-emerald-50 text-emerald-600",
    amber:  "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    gray:   "bg-gray-100 text-gray-500",
  };
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${accents[accent]}`}>
            <Icon size={14} />
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function RentBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-sky-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function UnitRow({ bedType, data, maxRent }) {
  if (!data?.averageRent) return null;
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="py-3 pr-4">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bedType.color}`}>
          {bedType.label}
        </span>
      </td>
      <td className="py-3 pr-4 text-sm font-semibold text-gray-900">{fmt(data.averageRent)}</td>
      <td className="py-3 pr-4 text-xs text-gray-400">
        {fmt(data.minRent)} â {fmt(data.maxRent)}
      </td>
      <td className="py-3 pr-6 w-32 hidden sm:table-cell">
        <RentBar value={data.averageRent} max={maxRent} />
      </td>
      <td className="py-3 text-xs text-gray-400 text-right whitespace-nowrap">
        {data.averageDaysOnMarket ? `${Math.round(data.averageDaysOnMarket)}d` : "â"}
      </td>
    </tr>
  );
}

function ListingRow({ listing }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="min-w-0 flex-1 pr-4">
        <div className="text-sm font-medium text-gray-800 truncate">
          {listing.formattedAddress || listing.addressLine1 || "â"}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {[
            listing.bedrooms != null && `${listing.bedrooms} bd`,
            listing.bathrooms != null && `${listing.bathrooms} ba`,
            listing.squareFootage && `${Math.round(listing.squareFootage).toLocaleString()} sqft`,
          ]
            .filter(Boolean)
            .join(" Â· ")}
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
        {fmt(listing.price)}
        <span className="text-xs font-normal text-gray-400">/mo</span>
      </div>
    </div>
  );
}

// âââ MAIN COMPONENT âââââââââââââââââââââââââââââââââââââââââââââââ

export default function MarketStatsDashboard({ defaultZip = "" }) {
  const [zip, setZip] = useState(defaultZip);
  const [propertyType, setPropertyType] = useState("Single Family");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [listings, setListings] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    if (!zip.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (USE_MOCK_DATA) {
        // Simulate network delay in mock mode
        await new Promise((r) => setTimeout(r, 800));
        setData(MOCK_DATA);
        setListings(MOCK_LISTINGS);
      } else {
        const [marketRes, listingsRes] = await Promise.all([
          fetch(
            `${BACKEND_URL}/api/rentcast/markets?zipCode=${encodeURIComponent(zip)}&propertyType=${encodeURIComponent(propertyType)}&dataType=All`
          ),
          fetch(
            `${BACKEND_URL}/api/rentcast/listings?zipCode=${encodeURIComponent(zip)}&propertyType=${encodeURIComponent(propertyType)}&status=Active&limit=5`
          ),
        ]);

        if (!marketRes.ok) {
          const err = await marketRes.json().catch(() => ({}));
          throw new Error(err.message || `RentCast error ${marketRes.status}`);
        }

        const marketData = await marketRes.json();
        const listingsData = listingsRes.ok ? await listingsRes.json() : [];

        setData(marketData);
        setListings(Array.isArray(listingsData) ? listingsData : []);
      }

      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when defaultZip is provided (e.g. from deal detail page)
  const didAutoFetch = useRef(false);
  useEffect(() => {
    if (defaultZip && !didAutoFetch.current) {
      didAutoFetch.current = true;
      fetchData();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const r = data?.rentalData || {};
  const s = data?.saleData || {};

  const unitRows = BED_TYPES.map((b) => ({ bedType: b, data: r[b.key] })).filter(
    (x) => x.data?.averageRent
  );
  const maxRent = Math.max(...unitRows.map((x) => x.data?.averageRent || 0), 1);

  return (
    <div className="font-sans">
      <div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
              <BarChart2 size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900">Market intelligence</h1>
              <p className="text-xs text-gray-400">Powered by RentCast</p>
            </div>
          </div>
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
        </div>

        {/* Search bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              placeholder="ZIP code (e.g. 78701)"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={fetchData}
            disabled={loading || !zip.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            {loading ? "Loadingâ¦" : "Fetch"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 mb-6 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Could not load market data</p>
              <p className="text-red-500 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <Building2 size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">No market loaded</p>
            <p className="text-xs text-gray-400 mt-1">Enter a ZIP code to pull live RentCast data</p>
          </div>
        )}

        {/* Dashboard content */}
        {data && !loading && (
          <div className="space-y-4">

            {/* Metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <MetricCard label="Avg rent" value={fmt(r.averageRent)} sub="per month" icon={TrendingUp} accent="blue" />
              <MetricCard label="Vacancy rate" value={fmtPct(r.averageVacancy)} sub="avg vacancy" icon={Home} accent="green" />
              <MetricCard label="Days on market" value={r.averageDaysOnMarket ? `${Math.round(r.averageDaysOnMarket)}d` : "â"} sub="avg rental DOM" icon={Clock} accent="amber" />
              <MetricCard label="Rent range" value={`${fmt(r.minRent)} â ${fmt(r.maxRent)}`} sub="min / max" accent="gray" />
              <MetricCard label="Avg sale price" value={fmt(s.averagePrice)} sub="sale comps" icon={Building2} accent="violet" />
              <MetricCard label="Sale DOM" value={s.averageDaysOnMarket ? `${Math.round(s.averageDaysOnMarket)}d` : "â"} sub="avg days on market" icon={Clock} accent="gray" />
            </div>

            {/* Unit type breakdown */}
            {unitRows.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Rent by bedroom count
                </h2>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left text-xs text-gray-400 font-medium">Type</th>
                      <th className="pb-2 text-left text-xs text-gray-400 font-medium">Avg rent</th>
                      <th className="pb-2 text-left text-xs text-gray-400 font-medium">Range</th>
                      <th className="pb-2 text-left text-xs text-gray-400 font-medium hidden sm:table-cell"></th>
                      <th className="pb-2 text-right text-xs text-gray-400 font-medium">DOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitRows.map(({ bedType, data: bd }) => (
                      <UnitRow key={bedType.key} bedType={bedType} data={bd} maxRent={maxRent} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Active listings */}
            {listings.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Active rental listings
                </h2>
                <div>
                  {listings.map((l, i) => (
                    <ListingRow key={i} listing={l} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
