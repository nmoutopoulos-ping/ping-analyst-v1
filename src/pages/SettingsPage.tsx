import { useEffect, useState } from "react";
import { Save, Check } from "lucide-react";
import { apiGet, apiPatch, getApiKey } from "@/lib/api";
import { Assumptions } from "@/lib/types";
import TopNav from "@/components/TopNav";

const fields: { key: keyof Assumptions; label: string; hint: string }[] = [
  { key: "ltv", label: "Loan-to-Value (LTV)", hint: "e.g. 0.70 = 70%" },
  { key: "closing_pct", label: "Closing Cost %", hint: "e.g. 0.02 = 2%" },
  { key: "vacancy", label: "Vacancy Rate", hint: "e.g. 0.07 = 7%" },
  { key: "opex_ratio", label: "Operating Expense Ratio", hint: "e.g. 0.35 = 35%" },
  { key: "int_rate", label: "Interest Rate", hint: "e.g. 0.065 = 6.5%" },
  { key: "rent_growth_1", label: "Year 1 Rent Growth", hint: "e.g. 0.03 = 3%" },
  { key: "other_inc_mo", label: "Other Monthly Income ($)", hint: "Per-unit monthly (laundry, parking, etc.)" },
];

export default function SettingsPage() {
  const [values, setValues] = useState<Assumptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<{ ok: boolean; assumptions: Assumptions }>("/settings")
      .then((res) => setValues(res.assumptions))
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!values) return;
    setSaving(true);
    setSaved(false);
    try {
      await apiPatch("/settings", { api_key: getApiKey(), assumptions: values });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground">Assumptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default financial assumptions used in every underwriting.
        </p>

        {loading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {values && (
          <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="space-y-5">
              {fields.map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="label-uppercase mb-1.5 block">{label}</label>
                  <input
                    type="number"
                    step="any"
                    value={values[key] ?? ""}
                    onChange={(e) =>
                      setValues({ ...values, [key]: parseFloat(e.target.value) || 0 })
                    }
                    placeholder={hint}
                    className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved" : saving ? "Saving…" : "Save Assumptions"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
