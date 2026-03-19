import { Download, Chrome, ExternalLink } from "lucide-react";
import TopNav from "@/components/TopNav";

export default function ExtensionPage() {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-foreground">Chrome Extension</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Install the Ping Analyst Chrome extension to underwrite deals directly from listing sites.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Chrome className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">Ping Analyst for Chrome</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Automatically extract property data from listing pages and run underwriting with one click.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://chromewebstore.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-4 w-4" />
                  Install Extension
                </a>
                <a
                  href="https://docs.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Documentation
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">How it works</h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Install the extension from the Chrome Web Store.</li>
            <li>Navigate to a property listing on any supported site.</li>
            <li>Click the Ping Analyst icon — the extension extracts property details automatically.</li>
            <li>Review the pre-filled data and hit <strong>Run Analysis</strong>.</li>
            <li>Results appear here in your Deals dashboard.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
