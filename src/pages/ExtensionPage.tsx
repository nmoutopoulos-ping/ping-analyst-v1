import { Download, Chrome } from "lucide-react";

const API_BASE = "https://analyst-ra00.onrender.com";

export default function ExtensionPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Chrome Extension</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Install the Ping Analyst Chrome extension to underwrite deals directly
        from listing sites.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Chrome className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              Ping Analyst for Chrome
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Automatically extract property data from listing pages and run
              underwriting with one click.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={API_BASE + "/api/extension-zip"}
                download="ping-analyst-extension.zip"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Download className="h-4 w-4" />
                Download Extension
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Installation steps
        </h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Click <strong>Download Extension</strong> above to get the .zip file.</li>
          <li>Unzip the downloaded file to a folder on your computer.</li>
          <li>
            Open Chrome and go to{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              chrome://extensions
            </code>
          </li>
          <li>
            Enable <strong>Developer mode</strong> (toggle in the top-right).
          </li>
          <li>
            Click <strong>Load unpacked</strong> and select the unzipped folder.
          </li>
          <li>
            Navigate to a property listing and click the Ping Analyst icon in
            your toolbar.
          </li>
        </ol>
      </div>
    </div>
  );
}
