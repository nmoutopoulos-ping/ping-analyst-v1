import { useState } from "react";
import { Download, Chrome, Key, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { getApiKey } from "@/lib/api";

const API_BASE = "https://analyst-ra00.onrender.com";

export default function ExtensionPage() {
  const [extPassword, setExtPassword] = useState("");
  const [extConfirm, setExtConfirm] = useState("");
  const [extStatus, setExtStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [extError, setExtError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSaveExtPassword = async () => {
    if (extPassword.length < 4) {
      setExtError("Password must be at least 4 characters");
      return;
    }
    if (extPassword !== extConfirm) {
      setExtError("Passwords do not match");
      return;
    }
    setExtStatus("saving");
    setExtError("");
    try {
      const res = await fetch(API_BASE + "/extension/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Api-Key": getApiKey() || "" },
        body: JSON.stringify({ password: extPassword }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save");
      setExtStatus("saved");
      setExtPassword("");
      setExtConfirm("");
      setTimeout(() => setExtStatus("idle"), 3000);
    } catch (e: any) {
      setExtStatus("error");
      setExtError(e.message || "Failed to fetch");
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-foreground">Chrome Extension</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Install the Ping Analyst Chrome extension to underwrite deals directly
        from listing sites.
      </p>

      {/* Download Section */}
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

      {/* Extension Password Section */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">
              Extension Password
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set a password to sign in to the Chrome extension. This is separate
              from your CRM login.
            </p>

            <div className="mt-4 space-y-3 max-w-sm">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={extPassword}
                    onChange={(e) => setExtPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={extConfirm}
                  onChange={(e) => setExtConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {extError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {extError}
                </p>
              )}
              {extStatus === "saved" && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Password saved
                </p>
              )}

              <button
                onClick={handleSaveExtPassword}
                disabled={extStatus === "saving"}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {extStatus === "saving" ? "Saving..." : "Save Extension Password"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Installation Steps */}
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
            Set your <strong>Extension Password</strong> above, then open the side
            panel and sign in with your email and password.
          </li>
        </ol>
      </div>
    </div>
  );
}
