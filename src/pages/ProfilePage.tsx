import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Chrome, Download, ExternalLink, User, Key, Eye, EyeOff, Check } from "lucide-react";
import { clearAuth, getUserName, getUserEmail, getApiKey } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const navigate = useNavigate();
  const fullName = getUserName() || "";
  const email = getUserEmail() || "";
  const [firstName, ...rest] = fullName.split(" ");
  const lastName = rest.join(" ");

  const handleSignOut = () => {
    clearAuth();
    navigate("/login");
  };

  const API_BASE = "https://analyst-ra00.onrender.com";
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
      setExtError(e.message);
      setExtStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account details and settings.</p>

        {/* User Info */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{fullName || "—"}</p>
              <p className="text-xs text-muted-foreground">{email || "—"}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <label className="label-uppercase mb-1 block">First Name</label>
              <p className="text-sm text-foreground">{firstName || "—"}</p>
            </div>
            <div>
              <label className="label-uppercase mb-1 block">Last Name</label>
              <p className="text-sm text-foreground">{lastName || "—"}</p>
            </div>
            <div className="col-span-2">
              <label className="label-uppercase mb-1 block">Email</label>
              <p className="text-sm text-foreground">{email || "—"}</p>
            </div>
          </div>
        </div>

        {/* Chrome Extension */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Chrome className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Chrome Extension</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Underwrite deals directly from listing sites with one click.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="https://chromewebstore.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install Extension
                </a>
                <a
                  href="https://docs.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Documentation
                </a>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-4">
            <h4 className="text-xs font-semibold text-foreground mb-2">How it works</h4>
            <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Install the extension from the Chrome Web Store.</li>
              <li>Navigate to a property listing on any supported site.</li>
              <li>Click the Ping Analyst icon to extract property details.</li>
              <li>Review pre-filled data and hit <strong>Run Analysis</strong>.</li>
              <li>Results appear in your Deals dashboard.</li>
            </ol>
          </div>
        </div>

        {/* Extension Password */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Extension Password</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Set a password to sign in to the Chrome extension. This is separate from your CRM login.
              </p>
              <div className="mt-3 space-y-3 max-w-sm">
                <div>
                  <label className="label-uppercase mb-1 block text-xs">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={extPassword}
                      onChange={(e) => setExtPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                  <label className="label-uppercase mb-1 block text-xs">Confirm Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={extConfirm}
                    onChange={(e) => setExtConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                {extError && <p className="text-xs text-destructive">{extError}</p>}
                <Button
                  onClick={handleSaveExtPassword}
                  disabled={extStatus === "saving"}
                  className="gap-1.5"
                  size="sm"
                >
                  {extStatus === "saving" ? "Saving…" : extStatus === "saved" ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save Extension Password"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <div className="mt-6">
          <Button variant="outline" className="w-full text-destructive hover:text-destructive hover:bg-destructive/5" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
  );
}
