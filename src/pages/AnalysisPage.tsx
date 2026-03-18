import { Building2 } from "lucide-react";
import TopNav from "@/components/TopNav";

const steps = [
  "Navigate to a Zillow, CoStar, or MLS listing",
  "Open the Ping Analyst side panel",
  "Review the pre-filled details and select an assumptions preset",
  "Click Run Analysis — results will appear here in Deals",
];

export default function AnalysisPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Building2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">New Analysis</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Analyses are submitted via the Ping Analyst Chrome extension.
          Open any listing, fill in the details, and run — the results will
          appear on your Deals board automatically.
        </p>

        <div className="mt-8 space-y-4 text-left">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </div>
              <p className="pt-1 text-sm text-foreground">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
