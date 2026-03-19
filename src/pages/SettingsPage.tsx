import { useEffect, useState } from "react";
import { Save, Check, Plus, Trash2, Star, StarOff, Pencil } from "lucide-react";
import { getApiKey } from "@/lib/api";
import {
  supabaseGetSettings,
  supabaseUpdateSettings,
  supabaseGetAssumptionTemplates,
  supabaseCreateAssumptionTemplate,
  supabaseUpdateAssumptionTemplate,
  supabaseDeleteAssumptionTemplate,
} from "@/lib/supabase";
import { Assumptions, AssumptionTemplate } from "@/lib/types";
import TopNav from "@/components/TopNav";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const fields: { key: keyof Assumptions; label: string; hint: string }[] = [
  { key: "ltv", label: "Loan-to-Value (LTV)", hint: "e.g. 0.70 = 70%" },
  { key: "closing_pct", label: "Closing Cost %", hint: "e.g. 0.02 = 2%" },
  { key: "vacancy", label: "Vacancy Rate", hint: "e.g. 0.07 = 7%" },
  { key: "opex_ratio", label: "Operating Expense Ratio", hint: "e.g. 0.35 = 35%" },
  { key: "int_rate", label: "Interest Rate", hint: "e.g. 0.065 = 6.5%" },
  { key: "rent_growth_1", label: "Year 1 Rent Growth", hint: "e.g. 0.03 = 3%" },
  { key: "other_inc_mo", label: "Other Monthly Income ($)", hint: "Per-unit monthly (laundry, parking, etc.)" },
];

const emptyAssumptions: Assumptions = {
  ltv: 0, closing_pct: 0, vacancy: 0, opex_ratio: 0, int_rate: 0, rent_growth_1: 0, other_inc_mo: 0,
};

export default function SettingsPage() {
  const [values, setValues] = useState<Assumptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Assumption templates state
  const [templates, setTemplates] = useState<AssumptionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { toast } = useToast();

  const apiKey = getApiKey()!;

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      supabaseGetSettings(apiKey),
      supabaseGetAssumptionTemplates(apiKey),
    ])
      .then(([settings, tpls]) => {
        setValues(settings.assumptions as Assumptions);
        setTemplates(tpls);
        // Auto-select default template
        const def = tpls.find((t) => t.is_default);
        if (def) setSelectedTemplateId(def.id);
      })
      .catch(() => setError("Failed to load settings."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async () => {
    if (!values) return;
    setSaving(true);
    setSaved(false);
    try {
      await supabaseUpdateSettings(apiKey, values as unknown as Record<string, unknown>);
      if (selectedTemplateId) {
        await supabaseUpdateAssumptionTemplate(selectedTemplateId, apiKey, { assumptions: values });
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplateId ? { ...t, assumptions: values } : t))
        );
      }
      setSaved(true);
      toast({ title: "Assumptions saved", description: "Your assumptions have been updated." });
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setValues({ ...emptyAssumptions, ...tpl.assumptions });
      setSelectedTemplateId(id);
    }
  };

  const handleSaveAsNew = async () => {
    if (!newTemplateName.trim() || !values) return;
    try {
      const created = await supabaseCreateAssumptionTemplate(apiKey, newTemplateName.trim(), values, false);
      setTemplates((prev) => [created, ...prev]);
      setSelectedTemplateId(created.id);
      setNewTemplateName("");
      setShowSaveAs(false);
      toast({ title: "Template saved", description: `"${created.name}" created.` });
    } catch {
      toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await supabaseUpdateAssumptionTemplate(id, apiKey, { is_default: true });
      setTemplates((prev) =>
        prev.map((t) => ({ ...t, is_default: t.id === id }))
      );
      toast({ title: "Default updated" });
    } catch {
      toast({ title: "Error", description: "Failed to set default.", variant: "destructive" });
    }
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      await supabaseUpdateAssumptionTemplate(id, apiKey, { name: renameValue.trim() });
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: renameValue.trim() } : t))
      );
      setRenamingId(null);
      setRenameValue("");
      toast({ title: "Template renamed" });
    } catch {
      toast({ title: "Error", description: "Failed to rename.", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await supabaseDeleteAssumptionTemplate(deleteId);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
      if (selectedTemplateId === deleteId) setSelectedTemplateId("");
      setDeleteId(null);
      toast({ title: "Template deleted" });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
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
          <>
            {/* Template selector */}
            <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Assumption Templates</h3>
              <div className="flex items-center gap-2">
                <Select value={selectedTemplateId} onValueChange={loadTemplate}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_default ? "⭐" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setShowSaveAs(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Save As
                </Button>
              </div>

              {/* Save-as inline form */}
              {showSaveAs && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Template name…"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveAsNew()}
                  />
                  <Button size="sm" onClick={handleSaveAsNew} disabled={!newTemplateName.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowSaveAs(false); setNewTemplateName(""); }}>
                    Cancel
                  </Button>
                </div>
              )}

              {/* Template list */}
              {templates.length > 0 && (
                <div className="mt-4 space-y-2">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                        t.id === selectedTemplateId
                          ? "border-primary/40 bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <button
                        onClick={() => loadTemplate(t.id)}
                        className="flex items-center gap-2 text-left text-foreground hover:text-primary transition-colors"
                      >
                        {t.name}
                        {t.is_default && (
                          <Badge className="border-0 bg-primary/10 text-primary text-[10px]">Default</Badge>
                        )}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetDefault(t.id)}
                          title={t.is_default ? "Default template" : "Set as default"}
                          className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"
                        >
                          {t.is_default ? <Star className="h-3.5 w-3.5 fill-primary text-primary" /> : <StarOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeleteId(t.id)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assumption fields */}
            <div className="mt-4 rounded-xl border border-border bg-card p-6 shadow-sm">
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
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this assumption template.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
