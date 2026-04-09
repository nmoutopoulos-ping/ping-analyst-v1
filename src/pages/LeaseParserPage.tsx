import { useState, useRef, useEffect } from "react";
import { Download, FileUp, Upload, Loader2, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, FileText, Trash2, Plus, MoreVertical, Edit2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  supabaseUploadLeaseFile,
  supabaseSaveLeaseExtraction,
  supabaseGetLeaseExtractions,
  supabaseDeleteLeaseExtraction,
  supabaseCreateLeaseSignedUrl,
  supabaseGetLeaseGroups,
  supabaseCreateLeaseGroup,
  supabaseUpdateLeaseGroup,
  supabaseDeleteLeaseGroup,
  supabaseGetLeaseGroupMembers,
  supabaseAddLeaseToGroup,
  supabaseRemoveLeaseFromGroup,
  supabaseGetDealsForGroupAssign,
} from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LeaseFields {
  tenant_name: string | null;
  tenant_entity_type: string | null;
  guarantor_name: string | null;
  property_address: string | null;
  unit_number: string | null;
  asset_class: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  lease_term_months: number | null;
  base_rent_monthly: number | null;
  base_rent_annual: number | null;
  rent_escalation_type: string | null;
  rent_escalation_value: number | null;
  free_rent_months: number | null;
  security_deposit: number | null;
  expense_structure: string | null;
  tenant_responsible_expenses: string[] | null;
  landlord_responsible_expenses: string[] | null;
  tenant_improvement_allowance: number | null;
  renewal_options: string[] | null;
  termination_option: string | null;
  termination_notice_months: number | null;
  confidently_extracted: string[] | null;
  notes: string | null;
}

interface UsageInfo {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
}

interface ParseResult {
  ok: boolean;
  parsed: LeaseFields;
  usage: UsageInfo;
}

type FileStatus = "pending" | "parsing" | "done" | "error";

interface QueueItem {
  id: string;
  file: File;
  status: FileStatus;
  result?: ParseResult;
  error?: string;
}

interface SavedLease {
  id: string;
  filename: string;
  tenant_name: string | null;
  property_address: string | null;
  base_rent_monthly: number | null;
  created_at: string;
  [key: string]: unknown;
}

interface LeaseGroup {
  id: string;
  name: string;
  deal_id: string | null;
  created_at: string;
  [key: string]: unknown;
}

interface Deal {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface FieldConfig {
  label: string;
  section: string;
  isArray?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_FILES = 20;
const VALID_EXTENSIONS = [".pdf", ".txt", ".csv", ".xlsx"];
const API_URL = "https://analyst-ra00.onrender.com/api/parse-lease";

const fieldConfigs: Record<string, FieldConfig> = {
  tenant_name: { label: "Tenant Name", section: "Tenant Info" },
  tenant_entity_type: { label: "Entity Type", section: "Tenant Info" },
  guarantor_name: { label: "Guarantor Name", section: "Tenant Info" },
  property_address: { label: "Property Address", section: "Property" },
  unit_number: { label: "Unit Number", section: "Property" },
  asset_class: { label: "Asset Class", section: "Property" },
  lease_start_date: { label: "Lease Start Date", section: "Lease Terms" },
  lease_end_date: { label: "Lease End Date", section: "Lease Terms" },
  lease_term_months: { label: "Lease Term (months)", section: "Lease Terms" },
  base_rent_monthly: { label: "Base Rent (monthly)", section: "Rent" },
  base_rent_annual: { label: "Base Rent (annual)", section: "Rent" },
  rent_escalation_type: { label: "Escalation Type", section: "Rent" },
  rent_escalation_value: { label: "Escalation Value", section: "Rent" },
  free_rent_months: { label: "Free Rent (months)", section: "Rent" },
  security_deposit: { label: "Security Deposit", section: "Rent" },
  expense_structure: { label: "Expense Structure", section: "Expenses" },
  tenant_responsible_expenses: { label: "Tenant Responsible", section: "Expenses", isArray: true },
  landlord_responsible_expenses: { label: "Landlord Responsible", section: "Expenses", isArray: true },
  tenant_improvement_allowance: { label: "Tenant Improvement Allowance", section: "Expenses" },
  renewal_options: { label: "Renewal Options", section: "Options" },
  termination_option: { label: "Termination Option", section: "Options" },
  termination_notice_months: { label: "Termination Notice (months)", section: "Options" },
  notes: { label: "Notes", section: "Confidence" },
};

const sections = ["Tenant Info", "Property", "Lease Terms", "Rent", "Expenses", "Options", "Confidence"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fileId() {
  return Math.random().toString(36).slice(2, 10);
}

function hasValidExtension(name: string): boolean {
  const lower = name.toLowerCase();
  return VALID_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateString;
  }
}

function getApiKey(): string | null {
  try {
    const token = localStorage.getItem("sb_access_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.user_metadata?.api_key || null;
  } catch {
    return null;
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldValue({ value, fieldName, confidentlyExtracted }: { value: unknown; fieldName: string; confidentlyExtracted: string[] | null }) {
  const isConfident = confidentlyExtracted?.includes(fieldName);
  const config = fieldConfigs[fieldName];

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.length === 0 ? (
          <span className="text-sm text-muted-foreground">Not found</span>
        ) : (
          value.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))
        )}
        {isConfident && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-1" />}
      </div>
    );
  }

  if (value === null || value === undefined || value === "") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Not found</span>
      </div>
    );
  }

  let displayValue = String(value);
  if (typeof value === "number" && (config?.label.includes("Rent") || config?.label.includes("Deposit") || config?.label.includes("Allowance"))) {
    displayValue = `$${(value as number).toLocaleString()}`;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-foreground">{displayValue}</span>
      {isConfident && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
    </div>
  );
}

function DropZone({ onFilesSelected, disabled }: { onFilesSelected: (files: File[]) => void; disabled: boolean }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesSelected(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border bg-card"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        type="file"
        id="file-input"
        onChange={handleFileInput}
        accept=".pdf,.txt,.csv,.xlsx"
        multiple
        disabled={disabled}
        className="hidden"
      />
      <label htmlFor="file-input" className="cursor-pointer">
        <Upload className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Drop your lease documents here</h3>
        <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
        <p className="text-xs text-muted-foreground">Up to {MAX_FILES} files — PDF, TXT, CSV, XLSX</p>
      </label>
    </div>
  );
}

function QueueList({ queue, onRemove, disabled }: { queue: QueueItem[]; onRemove: (id: string) => void; disabled: boolean }) {
  return (
    <div className="space-y-2">
      {queue.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {item.status === "pending" && (
              <Badge variant="secondary" className="text-xs">Pending</Badge>
            )}
            {item.status === "parsing" && (
              <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Parsing
              </Badge>
            )}
            {item.status === "done" && (
              <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Done
              </Badge>
            )}
            {item.status === "error" && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" /> Error
              </Badge>
            )}
            {item.status === "pending" && !disabled && (
              <button onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ queue }: { queue: QueueItem[] }) {
  const done = queue.filter((q) => q.status === "done").length;
  const errors = queue.filter((q) => q.status === "error").length;
  const total = queue.length;
  const completed = done + errors;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Processing {completed} of {total} files...
        </span>
        <span className="font-medium text-foreground">{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Group Management Sub-components ────────────────────────────────────────

function GroupsPanel({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onRenameGroup,
  onAssignDeal,
  onDeleteGroup,
  deals,
  groupMembersCount,
  loadingGroups,
}: {
  groups: LeaseGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onCreateGroup: (name: string) => Promise<void>;
  onRenameGroup: (groupId: string, newName: string) => Promise<void>;
  onAssignDeal: (groupId: string, dealId: string | null) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  deals: Deal[];
  groupMembersCount: Map<string, number>;
  loadingGroups: boolean;
}) {
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningDealId, setAssigningDealId] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await onCreateGroup(newGroupName);
    setNewGroupName("");
    setCreatingGroup(false);
  };

  const handleRenameGroup = async (groupId: string) => {
    if (!renamingValue.trim()) return;
    await onRenameGroup(groupId, renamingValue);
    setRenamingId(null);
    setRenamingValue("");
  };

  const handleDeleteGroup = async (groupId: string) => {
    await onDeleteGroup(groupId);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          onClick={() => setCreatingGroup(true)}
          className="w-full gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" /> Create Group
        </Button>
      </div>

      {creatingGroup && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Group name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateGroup();
                  if (e.key === "Escape") setCreatingGroup(false);
                }}
                autoFocus
                className="flex-1 px-3 py-2 rounded border border-input bg-background text-sm"
              />
              <Button
                size="sm"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreatingGroup(false);
                  setNewGroupName("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingGroups ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* All Leases option */}
          <button
            onClick={() => onSelectGroup(null)}
            className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
              selectedGroupId === null
                ? "bg-primary/10 border-primary/30 text-primary font-medium"
                : "border-transparent hover:bg-muted/50 text-foreground"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">All Leases</span>
              <Badge variant="secondary" className="text-xs">
                {groupMembersCount.get("all") || 0}
              </Badge>
            </div>
          </button>

          {/* Groups list */}
          {groups.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">No groups yet</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id}>
                {renamingId === group.id ? (
                  <div className="flex gap-2 px-2 py-1">
                    <input
                      type="text"
                      value={renamingValue}
                      onChange={(e) => setRenamingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameGroup(group.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 rounded border border-input bg-background text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRenameGroup(group.id)}
                      disabled={!renamingValue.trim()}
                    >
                      OK
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectGroup(group.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors group/item ${
                      selectedGroupId === group.id
                        ? "bg-primary/10 border-primary/30 text-primary font-medium"
                        : "border-transparent hover:bg-muted/50 text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {groupMembersCount.get(group.id) || 0} lease{groupMembersCount.get(group.id) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <GroupMenu
                          group={group}
                          deals={deals}
                          onRename={() => {
                            setRenamingId(group.id);
                            setRenamingValue(group.name);
                          }}
                          onAssignDeal={onAssignDeal}
                          onDelete={() => setDeletingId(group.id)}
                          assigningDealId={assigningDealId}
                          setAssigningDealId={setAssigningDealId}
                        />
                      </div>
                    </div>
                  </button>
                )}

                {/* Delete confirmation */}
                {deletingId === group.id && (
                  <Card className="mt-2 border-destructive/50 bg-destructive/5">
                    <CardContent className="pt-3">
                      <p className="text-sm text-foreground mb-3">
                        Delete "{group.name}"? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function GroupMenu({
  group,
  deals,
  onRename,
  onAssignDeal,
  onDelete,
  assigningDealId,
  setAssigningDealId,
}: {
  group: LeaseGroup;
  deals: Deal[];
  onRename: () => void;
  onAssignDeal: (groupId: string, dealId: string | null) => Promise<void>;
  onDelete: () => void;
  assigningDealId: string | null;
  setAssigningDealId: (id: string | null) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [loadingAssign, setLoadingAssign] = useState(false);

  const handleAssignDeal = async (dealId: string | null) => {
    setLoadingAssign(true);
    await onAssignDeal(group.id, dealId);
    setLoadingAssign(false);
    setAssigningDealId(null);
    setShowMenu(false);
  };

  if (assigningDealId === group.id) {
    return (
      <div className="relative">
        <select
          autoFocus
          className="px-2 py-1 text-sm rounded border border-input bg-background"
          onChange={(e) => handleAssignDeal(e.target.value || null)}
          disabled={loadingAssign}
        >
          <option value="">None</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-1 hover:bg-muted rounded transition-colors"
      >
        <MoreVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-48">
          <button
            onClick={() => {
              onRename();
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
          >
            <Edit2 className="h-4 w-4" /> Rename
          </button>

          <button
            onClick={() => {
              setAssigningDealId(group.id);
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
          >
            <Unlink className="h-4 w-4" /> Assign to Deal
          </button>

          <button
            onClick={() => {
              onDelete();
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SingleResult({
  item,
  onBack,
  isSavedLease = false,
}: {
  item: QueueItem | SavedLease;
  onBack: () => void;
  isSavedLease?: boolean;
}) {
  const isQueueItem = "file" in item;
  const result = isQueueItem ? (item as QueueItem).result : null;
  const filename = isQueueItem ? (item as QueueItem).file.name : (item as SavedLease).filename;
  const fileSize = isQueueItem ? (item as QueueItem).file.size : undefined;

  // For saved leases, reconstruct parsed data from the item
  const parsed = result?.parsed || (isSavedLease ? (item as SavedLease) : null);
  const usage = result?.usage;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <h2 className="text-xl font-bold text-foreground mb-1">{filename}</h2>
      {fileSize && <p className="text-sm text-muted-foreground mb-6">{formatBytes(fileSize)}</p>}

      <div className="grid gap-6 mb-8">
        {sections.map((section) => {
          const fieldsInSection = Object.entries(fieldConfigs).filter(([_, config]) => config.section === section);
          if (fieldsInSection.length === 0) return null;
          return (
            <Card key={section}>
              <CardHeader>
                <CardTitle className="text-lg">{section}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {fieldsInSection.map(([fieldName, config]) => (
                    <div key={fieldName} className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{config.label}</p>
                      {parsed && (
                        <FieldValue
                          value={parsed[fieldName as keyof LeaseFields]}
                          fieldName={fieldName}
                          confidentlyExtracted={(parsed as any).confidently_extracted}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {usage && (
        <Card className="bg-muted/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>Prompt tokens: {usage.prompt_tokens.toLocaleString()}</span>
              <span>Completion tokens: {usage.completion_tokens.toLocaleString()}</span>
              <span className="font-semibold">Cost: ${usage.estimated_cost.toFixed(4)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LeaseParserPage() {
  const [tab, setTab] = useState<"parse" | "saved">("parse");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [savedLeases, setSavedLeases] = useState<SavedLease[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [viewingSavedId, setViewingSavedId] = useState<string | null>(null);
  const abortRef = useRef(false);
  const { toast } = useToast();

  // Group management state
  const [groups, setGroups] = useState<LeaseGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Map<string, string[]>>(new Map());
  const [selectedLeaseIds, setSelectedLeaseIds] = useState<Set<string>>(new Set());
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const getAuthToken = () => {
    const token = localStorage.getItem("sb_access_token");
    if (!token) {
      toast({ title: "Error", description: "Not authenticated. Please log in.", variant: "destructive" });
      throw new Error("No auth token");
    }
    return token;
  };

  // ── File selection ────────────────────────────────────────────────────────

  const handleFilesSelected = (files: File[]) => {
    const valid = files.filter((f) => hasValidExtension(f.name));
    const rejected = files.length - valid.length;

    if (rejected > 0) {
      toast({
        title: "Skipped files",
        description: `${rejected} file(s) had unsupported types and were skipped.`,
      });
    }

    setQueue((prev) => {
      const remaining = MAX_FILES - prev.length;
      if (remaining <= 0) {
        toast({ title: "Limit reached", description: `Maximum ${MAX_FILES} files allowed.` });
        return prev;
      }
      const toAdd = valid.slice(0, remaining);
      if (valid.length > remaining) {
        toast({ title: "Limit reached", description: `Only added ${remaining} of ${valid.length} files (max ${MAX_FILES}).` });
      }
      return [...prev, ...toAdd.map((f) => ({ id: fileId(), file: f, status: "pending" as FileStatus }))];
    });
  };

  const handleRemoveFile = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  // ── Parsing ───────────────────────────────────────────────────────────────

  const parseOneFile = async (item: QueueItem, token: string): Promise<QueueItem> => {
    const formData = new FormData();
    formData.append("file", item.file);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `API error: ${response.statusText}`);
      }

      const data: ParseResult = await response.json();
      return { ...item, status: "done", result: data };
    } catch (err) {
      return { ...item, status: "error", error: err instanceof Error ? err.message : "Unknown error" };
    }
  };

  const handleParseAll = async () => {
    const pending = queue.filter((q) => q.status === "pending");
    if (pending.length === 0) return;

    setProcessing(true);
    abortRef.current = false;

    let token: string;
    try {
      token = getAuthToken();
    } catch {
      setProcessing(false);
      return;
    }

    for (const item of pending) {
      if (abortRef.current) break;

      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "parsing" as FileStatus } : q)));

      const result = await parseOneFile(item, token);

      setQueue((prev) => prev.map((q) => (q.id === item.id ? result : q)));
    }

    setProcessing(false);

    const doneCount = pending.length;
    toast({ title: "Batch complete", description: `Processed ${doneCount} file(s).` });
  };

  const handleStop = () => {
    abortRef.current = true;
  };

  // ── Save functionality ────────────────────────────────────────────────────

  const handleSaveAll = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Could not extract API key. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    const successfulResults = queue.filter((q) => q.status === "done" && q.result);
    if (successfulResults.length === 0) {
      toast({
        title: "Nothing to save",
        description: "No successfully parsed files to save.",
      });
      return;
    }

    setSaving(true);

    let savedCount = 0;
    for (let i = 0; i < successfulResults.length; i++) {
      const item = successfulResults[i];
      const progress = `${i + 1} of ${successfulResults.length}`;

      try {
        // Upload file to storage
        const storagePath = await supabaseUploadLeaseFile(apiKey, item.file);
        if (!storagePath) {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${item.file.name}`,
            variant: "destructive",
          });
          continue;
        }

        // Save extraction data to database
        const extractionData = {
          api_key: apiKey,
          filename: item.file.name,
          file_size: item.file.size,
          storage_path: storagePath,
          ...item.result!.parsed,
          prompt_tokens: item.result!.usage.prompt_tokens,
          completion_tokens: item.result!.usage.completion_tokens,
          estimated_cost: item.result!.usage.estimated_cost,
        };

        const saved = await supabaseSaveLeaseExtraction(extractionData);
        if (saved) {
          savedCount++;
        } else {
          toast({
            title: "Save failed",
            description: `Failed to save metadata for ${item.file.name}`,
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Save error:", err);
      }
    }

    setSaving(false);

    if (savedCount > 0) {
      toast({
        title: "Success",
        description: `Saved ${savedCount} lease(s) to your library`,
      });
    }
  };

  // ── Saved leases functionality ────────────────────────────────────────────

  const loadSavedLeases = async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Could not extract API key.",
        variant: "destructive",
      });
      return;
    }

    setLoadingSaved(true);
    const leases = await supabaseGetLeaseExtractions(apiKey);
    setSavedLeases(leases as SavedLease[]);
    setLoadingSaved(false);
  };

  const handleDeleteLease = async (id: string) => {
    const success = await supabaseDeleteLeaseExtraction(id);
    if (success) {
      setSavedLeases((prev) => prev.filter((l) => l.id !== id));
      toast({
        title: "Deleted",
        description: "Lease extraction removed from library",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete lease extraction",
        variant: "destructive",
      });
    }
  };

  const handleDownloadOriginal = async (lease: SavedLease) => {
    const storagePath = lease.storage_path as string | null;
    if (!storagePath) {
      toast({
        title: "Error",
        description: "No storage path found",
        variant: "destructive",
      });
      return;
    }

    const signedUrl = await supabaseCreateLeaseSignedUrl(storagePath);
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    } else {
      toast({
        title: "Error",
        description: "Failed to generate download link",
        variant: "destructive",
      });
    }
  };

  const handleDownloadJson = (lease: SavedLease) => {
    const json = JSON.stringify(lease, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lease.filename.replace(/\.[^.]+$/, "")}-parsed.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    const results = queue
      .filter((q) => q.status === "done" && q.result)
      .map((q) => ({
        filename: q.file.name,
        ...q.result!.parsed,
      }));

    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lease-batch-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSingle = (item: QueueItem) => {
    if (!item.result) return;
    const json = JSON.stringify(item.result.parsed, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.file.name.replace(/\.[^.]+$/, "")}-parsed.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Group management functions ─────────────────────────────────────────────

  const loadGroups = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    setLoadingGroups(true);
    try {
      const fetchedGroups = await supabaseGetLeaseGroups(apiKey);
      setGroups(fetchedGroups as LeaseGroup[]);

      // Load member counts for all groups
      const memberCountMap = new Map<string, number>();
      memberCountMap.set("all", savedLeases.length);

      for (const group of fetchedGroups as LeaseGroup[]) {
        const members = await supabaseGetLeaseGroupMembers(group.id);
        const memberIds = members.map((m: any) => m.lease_extraction_id);
        setGroupMembers((prev) => new Map(prev).set(group.id, memberIds));
        memberCountMap.set(group.id, memberIds.length);
      }

      // Update the map with all counts
      setGroupMembers((prev) => {
        const updated = new Map(prev);
        updated.set("all", savedLeases.length);
        return updated;
      });
    } catch (err) {
      console.error("Error loading groups:", err);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreateGroup = async (name: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const newGroup = await supabaseCreateLeaseGroup(apiKey, name);
      if (newGroup) {
        setGroups((prev) => [...prev, newGroup as LeaseGroup]);
        setGroupMembers((prev) => new Map(prev).set((newGroup as any).id, []));
        toast({ title: "Success", description: `Group "${name}" created` });
      }
    } catch (err) {
      console.error("Error creating group:", err);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const handleRenameGroup = async (groupId: string, newName: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const updated = await supabaseUpdateLeaseGroup(apiKey, groupId, { name: newName });
      if (updated) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, name: newName } : g))
        );
        toast({ title: "Success", description: "Group renamed" });
      }
    } catch (err) {
      console.error("Error renaming group:", err);
      toast({
        title: "Error",
        description: "Failed to rename group",
        variant: "destructive",
      });
    }
  };

  const handleAssignDeal = async (groupId: string, dealId: string | null) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const updated = await supabaseUpdateLeaseGroup(apiKey, groupId, { deal_id: dealId });
      if (updated) {
        setGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, deal_id: dealId } : g))
        );
        toast({
          title: "Success",
          description: dealId ? "Deal assigned" : "Deal unlinked",
        });
      }
    } catch (err) {
      console.error("Error assigning deal:", err);
      toast({
        title: "Error",
        description: "Failed to assign deal",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const success = await supabaseDeleteLeaseGroup(apiKey, groupId);
      if (success) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setGroupMembers((prev) => {
          const updated = new Map(prev);
          updated.delete(groupId);
          return updated;
        });
        if (selectedGroupId === groupId) {
          setSelectedGroupId(null);
        }
        toast({ title: "Success", description: "Group deleted" });
      }
    } catch (err) {
      console.error("Error deleting group:", err);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const handleAddLeaseToGroup = async (groupId: string, leaseIds: string[]) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      for (const leaseId of leaseIds) {
        await supabaseAddLeaseToGroup(apiKey, groupId, leaseId);
      }

      // Update local group members
      const members = await supabaseGetLeaseGroupMembers(groupId);
      const memberIds = members.map((m: any) => m.lease_extraction_id);
      setGroupMembers((prev) => new Map(prev).set(groupId, memberIds));

      setSelectedLeaseIds(new Set());
      toast({
        title: "Success",
        description: `Added ${leaseIds.length} lease(s) to group`,
      });
    } catch (err) {
      console.error("Error adding leases to group:", err);
      toast({
        title: "Error",
        description: "Failed to add leases to group",
        variant: "destructive",
      });
    }
  };

  const handleRemoveLeaseFromGroup = async (groupId: string, leaseIds: string[]) => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      for (const leaseId of leaseIds) {
        await supabaseRemoveLeaseFromGroup(apiKey, groupId, leaseId);
      }

      // Update local group members
      const members = await supabaseGetLeaseGroupMembers(groupId);
      const memberIds = members.map((m: any) => m.lease_extraction_id);
      setGroupMembers((prev) => new Map(prev).set(groupId, memberIds));

      setSelectedLeaseIds(new Set());
      toast({
        title: "Success",
        description: `Removed ${leaseIds.length} lease(s) from group`,
      });
    } catch (err) {
      console.error("Error removing leases from group:", err);
      toast({
        title: "Error",
        description: "Failed to remove leases from group",
        variant: "destructive",
      });
    }
  };

  const loadDeals = async () => {
    const apiKey = getApiKey();
    if (!apiKey) return;

    try {
      const fetchedDeals = await supabaseGetDealsForGroupAssign(apiKey);
      setDeals(fetchedDeals as Deal[]);
    } catch (err) {
      console.error("Error loading deals:", err);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setQueue([]);
    setViewingId(null);
    setProcessing(false);
    abortRef.current = false;
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const doneCount = queue.filter((q) => q.status === "done").length;
  const errorCount = queue.filter((q) => q.status === "error").length;
  const hasResults = doneCount > 0 || errorCount > 0;
  const allDone = queue.length > 0 && pendingCount === 0 && !processing;

  // ── Detail view ───────────────────────────────────────────────────────────

  const viewingItem = viewingId ? queue.find((q) => q.id === viewingId) : null;
  const viewingSaved = viewingSavedId ? savedLeases.find((l) => l.id === viewingSavedId) : null;

  // Detail view for individual parsed result
  if (viewingItem?.status === "done" && viewingItem.result) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Lease Parse Results</h1>
        </div>
        <SingleResult item={viewingItem} onBack={() => setViewingId(null)} />

        <div className="flex gap-3 mt-8">
          <Button onClick={() => handleDownloadSingle(viewingItem)} className="gap-2">
            <Download className="h-4 w-4" /> Download JSON
          </Button>
          <Button variant="outline" onClick={() => setViewingId(null)}>
            Back to All Results
          </Button>
        </div>
      </main>
    );
  }

  // Detail view for saved lease
  if (viewingSaved) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Saved Lease Details</h1>
        </div>
        <SingleResult item={viewingSaved as any} onBack={() => setViewingSavedId(null)} isSavedLease />

        <div className="flex gap-3 mt-8">
          <Button onClick={() => handleDownloadJson(viewingSaved)} className="gap-2">
            <Download className="h-4 w-4" /> Download JSON
          </Button>
          <Button onClick={() => handleDownloadOriginal(viewingSaved)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Download Original
          </Button>
          <Button onClick={() => handleDeleteLease(viewingSaved.id)} variant="destructive" className="gap-2">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <Button variant="outline" onClick={() => setViewingSavedId(null)}>
            Back to Library
          </Button>
        </div>
      </main>
    );
  }

  // Saved Leases tab
  if (tab === "saved") {
    // Load groups and leases on mount when tab is active
    useEffect(() => {
      const initSavedTab = async () => {
        await loadSavedLeases();
        await loadGroups();
        await loadDeals();
      };
      initSavedTab();
    }, []);

    // Filter leases based on selected group
    const filteredLeases =
      selectedGroupId === null
        ? savedLeases
        : savedLeases.filter((lease) => {
            const groupMemberIds = groupMembers.get(selectedGroupId);
            return groupMemberIds?.includes(lease.id);
          });

    // Group member counts
    const groupMembersCount = new Map<string, number>();
    groupMembersCount.set("all", savedLeases.length);
    groups.forEach((group) => {
      const count = groupMembers.get(group.id)?.length || 0;
      groupMembersCount.set(group.id, count);
    });

    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Lease Parser</h1>
          <p className="text-base text-muted-foreground">Manage and review your saved lease extractions.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 mb-8 border-b border-border">
          <button
            onClick={() => setTab("parse")}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Parse New
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary"
          >
            Saved Leases
          </button>
        </div>

        {loadingSaved ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : savedLeases.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No saved leases yet.</p>
              <p className="text-sm text-muted-foreground mb-6">Parse some leases and save them to build your library.</p>
              <Button onClick={() => setTab("parse")} variant="outline">
                Parse New Leases
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Left panel: Groups */}
            <div className="lg:border-r border-border lg:pr-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Groups</h3>
              <GroupsPanel
                groups={groups}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
                onCreateGroup={handleCreateGroup}
                onRenameGroup={handleRenameGroup}
                onAssignDeal={handleAssignDeal}
                onDeleteGroup={handleDeleteGroup}
                deals={deals}
                groupMembersCount={groupMembersCount}
                loadingGroups={loadingGroups}
              />
            </div>

            {/* Right panel: Leases list */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedGroupId === null ? "All Leases" : groups.find((g) => g.id === selectedGroupId)?.name || "Leases"}
                </h3>
                <Badge variant="secondary">{filteredLeases.length}</Badge>
              </div>

              {filteredLeases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No leases in this group</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {filteredLeases.map((lease) => {
                      const isSelected = selectedLeaseIds.has(lease.id);
                      return (
                        <div
                          key={lease.id}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                            isSelected
                              ? "bg-primary/10 border-primary/30"
                              : "border-border bg-card hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedLeaseIds);
                              if (e.target.checked) {
                                newSelected.add(lease.id);
                              } else {
                                newSelected.delete(lease.id);
                              }
                              setSelectedLeaseIds(newSelected);
                            }}
                            className="shrink-0"
                          />
                          <div
                            className="min-w-0 flex-1 cursor-pointer"
                            onClick={() => setViewingSavedId(lease.id)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{lease.filename}</p>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {lease.tenant_name && `${lease.tenant_name}`}
                              {lease.tenant_name && lease.property_address && " — "}
                              {lease.property_address}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {lease.base_rent_monthly && `$${(lease.base_rent_monthly as number).toLocaleString()}/mo`}
                              {lease.base_rent_monthly && lease.created_at && " • "}
                              {lease.created_at && formatDate(lease.created_at as string)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Floating action bar for multi-select */}
                  {selectedLeaseIds.size > 0 && (
                    <Card className="fixed bottom-6 right-6 left-6 lg:left-auto lg:w-80 border-primary/50 shadow-lg">
                      <CardContent className="pt-4">
                        <p className="text-sm font-medium text-foreground mb-3">
                          {selectedLeaseIds.size} lease{selectedLeaseIds.size !== 1 ? "s" : ""} selected
                        </p>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddLeaseToGroup(e.target.value, Array.from(selectedLeaseIds));
                                  e.target.value = "";
                                }
                              }}
                              className="flex-1 px-3 py-2 rounded border border-input bg-background text-sm"
                            >
                              <option value="">Add to Group...</option>
                              {groups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedGroupId && selectedGroupId !== null && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleRemoveLeaseFromGroup(
                                  selectedGroupId,
                                  Array.from(selectedLeaseIds)
                                )
                              }
                              className="w-full"
                            >
                              Remove from Group
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedLeaseIds(new Set())}
                            className="w-full"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>
    );
  }

  // ── Results summary view ──────────────────────────────────────────────────

  if (allDone) {
    const totalCost = queue
      .filter((q) => q.result?.usage)
      .reduce((sum, q) => sum + (q.result!.usage.estimated_cost || 0), 0);

    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Lease Parser</h1>
          <p className="text-base text-muted-foreground">
            Upload up to {MAX_FILES} lease documents and we'll extract key terms, tenant info, rent structure, and more.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 mb-8 border-b border-border">
          <button
            onClick={() => setTab("parse")}
            className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary"
          >
            Parse New
          </button>
          <button
            onClick={() => {
              setTab("saved");
              loadSavedLeases();
            }}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Saved Leases
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Batch Results</h2>
          <p className="text-sm text-muted-foreground">
            {doneCount} parsed successfully{errorCount > 0 ? `, ${errorCount} failed` : ""} — Total cost: ${totalCost.toFixed(4)}
          </p>
        </div>

        <div className="space-y-3 mb-8">
          {queue.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                item.status === "done"
                  ? "border-border bg-card hover:bg-muted/50 cursor-pointer"
                  : "border-destructive/30 bg-destructive/5"
              }`}
              onClick={() => item.status === "done" && setViewingId(item.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.file.name}</p>
                  {item.status === "done" && item.result?.parsed.tenant_name && (
                    <p className="text-xs text-muted-foreground">
                      {item.result.parsed.tenant_name}
                      {item.result.parsed.property_address ? ` — ${item.result.parsed.property_address}` : ""}
                    </p>
                  )}
                  {item.status === "error" && (
                    <p className="text-xs text-destructive">{item.error}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {item.status === "done" && (
                  <>
                    <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Done
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
                {item.status === "error" && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" /> Error
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          {doneCount > 0 && (
            <>
              <Button onClick={handleDownloadAll} className="gap-2">
                <Download className="h-4 w-4" /> Download All ({doneCount}) as JSON
              </Button>
              <Button onClick={handleSaveAll} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Save All Results
                  </>
                )}
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleReset}>
            Start New Batch
          </Button>
        </div>
      </main>
    );
  }

  // ── Upload / queue view ───────────────────────────────────────────────────

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Lease Parser</h1>
        <p className="text-base text-muted-foreground">
          Upload up to {MAX_FILES} lease documents and we'll extract key terms, tenant info, rent structure, and more.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 mb-8 border-b border-border">
        <button
          onClick={() => setTab("parse")}
          className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-primary"
        >
          Parse New
        </button>
        <button
          onClick={() => {
            setTab("saved");
            loadSavedLeases();
          }}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Saved Leases
        </button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" /> Upload Lease Documents
          </CardTitle>
          <CardDescription>
            {queue.length === 0
              ? `Supports PDF, TXT, CSV, and XLSX — up to ${MAX_FILES} files`
              : `${queue.length} file(s) queued — ${MAX_FILES - queue.length} slots remaining`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dropzone (always visible unless processing) */}
          {queue.length < MAX_FILES && (
            <DropZone onFilesSelected={handleFilesSelected} disabled={processing} />
          )}

          {/* File queue */}
          {queue.length > 0 && (
            <QueueList queue={queue} onRemove={handleRemoveFile} disabled={processing} />
          )}

          {/* Progress bar during processing */}
          {processing && <ProgressBar queue={queue} />}

          {/* Action buttons */}
          {queue.length > 0 && (
            <div className="flex gap-3">
              {!processing ? (
                <>
                  <Button
                    onClick={handleParseAll}
                    disabled={pendingCount === 0}
                    className="flex-1"
                    size="lg"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Parse {pendingCount} {pendingCount === 1 ? "File" : "Files"}
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleReset}>
                    Clear All
                  </Button>
                </>
              ) : (
                <Button variant="destructive" size="lg" className="flex-1" onClick={handleStop}>
                  Stop Processing
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 rounded-lg border border-border/50 bg-card/50 p-6 text-sm text-muted-foreground">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground mb-1">What gets extracted?</p>
            <p>
              Each lease is parsed for 24 key fields including tenant info, property details, lease terms,
              rent structure, expense allocation, renewal/termination options, and extraction confidence scores.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
