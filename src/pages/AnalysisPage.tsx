import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MoreVertical, MapPin } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, getApiKey } from "@/lib/api";
import { Template } from "@/lib/types";
import TopNav from "@/components/TopNav";
import TemplateModal from "@/components/TemplateModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

function formatPrice(n?: number) {
  if (!n) return "—";
  return "$" + n.toLocaleString();
}

function statusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "sold":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export default function AnalysisPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchTemplates = () => {
    setLoading(true);
    apiGet<{ ok: boolean; templates: Template[] }>("/crm/templates")
      .then((res) => {
        setTemplates(res.templates || []);
        setError("");
      })
      .catch((err) => {
        if (err.message.includes("404")) {
          setTemplates([]);
          setError("");
        } else {
          setError("Failed to load templates.");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.address.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingTemplate(null);
    setModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingTemplate(t);
    setModalOpen(true);
  };

  const handleSave = async (data: Partial<Template>) => {
    const body = { ...data, api_key: getApiKey() };
    if (editingTemplate) {
      await apiPatch(`/crm/templates/${editingTemplate.id}`, body as Record<string, unknown>);
    } else {
      await apiPost("/crm/templates", body as Record<string, unknown>);
    }
    setModalOpen(false);
    fetchTemplates();
  };

  const handleSaveAndRun = async (data: Partial<Template>) => {
    const body = { ...data, api_key: getApiKey() };
    const res = await apiPost<{ ok: boolean; template_id: string }>("/crm/templates", body as Record<string, unknown>);
    if (res.template_id) {
      await apiPost("/crm/analyze", { api_key: getApiKey(), template_id: res.template_id } as Record<string, unknown>);
    }
    setModalOpen(false);
    toast({ title: "Analysis running", description: "Results will appear in Deals." });
    navigate("/deals");
  };

  const handleDuplicate = async (t: Template) => {
    const { id, ...rest } = t;
    await apiPost("/crm/templates", { ...rest, name: `${t.name} (Copy)`, api_key: getApiKey() } as Record<string, unknown>);
    fetchTemplates();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await apiDelete(`/crm/templates/${deleteId}`);
    setDeleteId(null);
    fetchTemplates();
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 items-center rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <Search className="mr-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter Search Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <Button onClick={openNew} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> New Search
          </Button>
        </div>

        {/* Section heading */}
        <h2 className="mt-8 text-lg font-semibold text-foreground">Search Templates</h2>

        {loading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">No templates yet — click + New Search to create one.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => openEdit(t)}
                className="group relative cursor-pointer rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Overflow menu */}
                <div className="absolute right-3 top-3" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(t)}>Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(t.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Name + Default badge */}
                <div className="flex items-center gap-2 pr-6">
                  <h3 className="text-sm font-bold text-foreground truncate">{t.name}</h3>
                  {t.is_default && (
                    <Badge className="border-0 bg-purple-100 text-purple-700 text-[10px] shrink-0">Default</Badge>
                  )}
                </div>

                {/* Address */}
                <div className="mt-3">
                  <div className="label-uppercase">Property Address</div>
                  <div className="mt-0.5 flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-foreground">{t.address || "—"}</p>
                  </div>
                  {t.lat != null && t.lng != null && (
                    <p className="mt-1 font-mono text-xs text-emerald-600">{t.lat.toFixed(6)}, {t.lng.toFixed(6)}</p>
                  )}
                </div>

                {/* Price / Improvements / Sqft */}
                <div className="mt-3 flex gap-4">
                  <div>
                    <div className="label-uppercase">Price</div>
                    <p className="text-sm font-medium text-foreground">{formatPrice(t.price)}</p>
                  </div>
                  <div>
                    <div className="label-uppercase">Improvements</div>
                    <p className="text-sm font-medium text-foreground">{formatPrice(t.improvements)}</p>
                  </div>
                  <div>
                    <div className="label-uppercase">Sqft</div>
                    <p className="text-sm font-medium text-foreground">{t.sqft?.toLocaleString() || "—"}</p>
                  </div>
                </div>

                {/* Unit Mix */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="label-uppercase">Unit Mix</div>
                  <Badge className="border-0 bg-accent/10 text-accent text-[10px]">{t.combos?.length || 0} Selected</Badge>
                </div>
                <p className="mt-0.5 text-sm text-foreground">{t.total_units || 0} Total Units</p>

                {/* Search Parameters collapsible */}
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 text-xs font-semibold text-accent hover:underline"
                    >
                      Search Parameters ▸
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span>Radius: {t.radius ?? "—"} mi</span>
                      <span>Min: {t.min_comps ?? "—"}</span>
                      <span>Max: {t.max_comps ?? "—"}</span>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Status */}
                {t.status && (
                  <div className="mt-3">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <TemplateModal
        open={modalOpen}
        template={editingTemplate}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onSaveAndRun={!editingTemplate ? handleSaveAndRun : undefined}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this template. Are you sure?</AlertDialogDescription>
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
