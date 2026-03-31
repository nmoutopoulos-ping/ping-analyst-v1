import MarketStatsDashboard from "@/components/MarketStatsDashboard";

export default function MarketSearchPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">Market Search</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Look up rental and sale market data for any ZIP code, powered by RentCast.
      </p>
      <div className="rounded-xl border border-border bg-card p-6">
        <MarketStatsDashboard defaultZip="" />
      </div>
    </div>
  );
}
