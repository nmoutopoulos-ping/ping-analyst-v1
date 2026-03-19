import { useEffect, useState } from "react";
import { Save, Check, Plus, Trash2, Star, StarOff, Pencil, X, Eye } from "lucide-react";
import { getApiKey } from "@/lib/api";
import {
  supabaseGetAssumptionTemplates,
  supabaseCreateAssumptionTemplate,
  supabaseUpdateAssumptionTemplate,
  supabaseDeleteAssumptionTemplate,
} from "@/lib/supabase";
import { Assumptions, AssumptionTemplate } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Assumption templates state
  const [templates, setTemplates] = useState<AssumptionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newValues, setNewValues] = useState<Assumptions>({ ...emptyAssumptions });
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [inspectId, setInspectId] = useState<string | null>(null);
  const { toast } = useToast();

  const apiKey = getApiKey()!;

  const fetchAll = () => {
    setLoading(true);
    supabaseGetAssumptionTemplates(apiKey)
      .then((tpls) => {
        setTemplates(tpls);
        const def = tpls.find((t) => t.is_default);
        if (def) setSelectedTemplateId(def.id);
      })
      .catch(() => setError("Failed to load templates."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const selectTemplate = (id: string) => setSelectedTemplateId(id);

  const handleSaveAsNew = async () => {
    if (!newTemplateName.trim()) return;
    setSaving(true);
    try {
      const created = await supabaseCreateAssumptionTemplate(apiKey, newTemplateName.trim(), newValues, false);
      setTemplates((prev) => [created, ...prev]);
      setSelectedTemplateId(created.id);
      setNewTemplateName("");
      setNewValues({ ...emptyAssumptions });
      setShowNewDialog(false);
      toast({ title: "Template saved", description: `"${created.name}" created.` });
    } catch {
      toast({ title: "Error", description: "Failed to save template.", variant: "destructive" });
    } finally {
      setSaving(false);
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
    <>
    <div className="mx-auto max-w-xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground">Assumptions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default financial assumptions used in every underwriting.
        </p>

        {loading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {!loading && (
          <>
            {/* New Template button */}
            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Saved Templates</h3>
              <Dialog open={showNewDialog} onOpenChange={(open) => {
                setShowNewDialog(open);
                if (!open) { setNewTemplateName(""); setNewValues({ ...emptyAssumptions }); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" /> New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>New Assumption Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="label-uppercase mb-1.5 block">Template Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Conservative, Aggressive…"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    {fields.map(({ key, label, hint }) => (
                      <div key={key}>
                        <label className="label-uppercase mb-1.5 block">{label}</label>
                        <input
                          type="number"
                          step="any"
                          value={newValues[key] ?? ""}
                          onChange={(e) =>
                            setNewValues({ ...newValues, [key]: parseFloat(e.target.value) || 0 })
                          }
                          placeholder={hint}
                          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                      </div>
                    ))}
                    <Button
                      className="w-full"
                      onClick={handleSaveAsNew}
                      disabled={!newTemplateName.trim() || saving}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {saving ? "Saving…" : "Save Template"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Templates list */}
            <div className="mt-3 rounded-xl border border-border bg-card p-5 shadow-sm">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved templates yet. Click "+ New Template" to create one.</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div key={t.id}>
                      <div
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                          t.id === selectedTemplateId
                            ? "border-primary/40 bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          {renamingId === t.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRename(t.id);
                                  if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                                }}
                                autoFocus
                                className="flex-1 rounded border border-input bg-card px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRename(t.id)}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setRenamingId(null); setRenameValue(""); }}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => selectTemplate(t.id)}
                              className="flex items-center gap-2 text-left text-foreground hover:text-primary transition-colors"
                            >
                              {t.name}
                              {t.is_default && (
                                <Badge className="border-0 bg-primary/10 text-primary text-[10px]">Default</Badge>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setInspectId(inspectId === t.id ? null : t.id)}
                            title="View assumptions"
                            className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setRenamingId(t.id); setRenameValue(t.name); }}
                            title="Rename template"
                            className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
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
                      {inspectId === t.id && t.assumptions && (
                        <div className="mt-1 rounded-lg border border-border bg-muted/30 px-4 py-3">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                            {fields.map(({ key, label }) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-medium text-foreground">{(t.assumptions as Assumptions)[key] ?? "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                </div>
              )}
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
  );
}
