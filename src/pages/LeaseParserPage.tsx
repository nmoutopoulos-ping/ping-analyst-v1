import { useState, useCallback } from "react";
import { Download, FileUp, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

interface FieldConfig {
  label: string;
  section: string;
  isArray?: boolean;
}

const fieldConfigs: Record<string, FieldConfig> = {
  // Tenant Info
  tenant_name: { label: "Tenant Name", section: "Tenant Info" },
  tenant_entity_type: { label: "Entity Type", section: "Tenant Info" },
  guarantor_name: { label: "Guarantor Name", section: "Tenant Info" },

  // Property
  property_address: { label: "Property Address", section: "Property" },
  unit_number: { label: "Unit Number", section: "Property" },
  asset_class: { label: "Asset Class", section: "Property" },

  // Lease Terms
  lease_start_date: { label: "Lease Start Date", section: "Lease Terms" },
  lease_end_date: { label: "Lease End Date", section: "Lease Terms" },
  lease_term_months: { label: "Lease Term (months)", section: "Lease Terms" },

  // Rent
  base_rent_monthly: { label: "Base Rent (monthly)", section: "Rent" },
  base_rent_annual: { label: "Base Rent (annual)", section: "Rent" },
  rent_escalation_type: { label: "Escalation Type", section: "Rent" },
  rent_escalation_value: { label: "Escalation Value", section: "Rent" },
  free_rent_months: { label: "Free Rent (months)", section: "Rent" },
  security_deposit: { label: "Security Deposit", section: "Rent" },

  // Expenses
  expense_structure: { label: "Expense Structure", section: "Expenses" },
  tenant_responsible_expenses: { label: "Tenant Responsible", section: "Expenses", isArray: true },
  landlord_responsible_expenses: { label: "Landlord Responsible", section: "Expenses", isArray: true },
  tenant_improvement_allowance: { label: "Tenant Improvement Allowance", section: "Expenses" },

  // Options
  renewal_options: { label: "Renewal Options", section: "Options" },
  termination_option: { label: "Termination Option", section: "Options" },
  termination_notice_months: { label: "Termination Notice (months)", section: "Options" },

  // Confidence
  notes: { label: "Notes", section: "Confidence" },
};

const sections = ["Tenant Info", "Property", "Lease Terms", "Rent", "Expenses", "Options", "Confidence"];

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

function DropZone({ onFileSelected, loading }: { onFileSelected: (file: File) => void; loading: boolean }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border bg-card"
      } ${loading ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        type="file"
        id="file-input"
        onChange={handleFileInput}
        accept=".pdf,.txt,.csv,.xlsx"
        disabled={loading}
        className="hidden"
      />
      <label htmlFor="file-input" className="cursor-pointer">
        <Upload className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Drop your lease document here</h3>
        <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
        <p className="text-xs text-muted-foreground">Supported: PDF, TXT, CSV, XLSX</p>
      </label>
    </div>
  );
}

export default function LeaseParserPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const { toast } = useToast();

  const getAuthToken = () => {
    const token = localStorage.getItem("sb_access_token");
    if (!token) {
      toast({ title: "Error", description: "Not authenticated. Please log in.", variant: "destructive" });
      throw new Error("No auth token");
    }
    return token;
  };

  const handleFileSelected = (file: File) => {
    const validTypes = ["application/pdf", "text/plain", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Error", description: "Invalid file type. Please use PDF, TXT, CSV, or XLSX.", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const handleParse = async () => {
    if (!selectedFile) {
      toast({ title: "Error", description: "Please select a file first.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("https://analyst-ra00.onrender.com/api/parse-lease", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `API error: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      toast({ title: "Success", description: "Lease parsed successfully." });
    } catch (err) {
      console.error("Parse error:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to parse lease.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJSON = () => {
    if (!result) return;
    const json = JSON.stringify(result.parsed, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lease-parse-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
  };

  if (result) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Lease Parse Results</h1>
          <div className="flex items-center gap-4">
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                File: <span className="font-mono font-semibold text-foreground">{selectedFile.name}</span>
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              Parse Another File
            </Button>
          </div>
        </div>

        {/* Results by section */}
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
                        <FieldValue
                          value={result.parsed[fieldName as keyof LeaseFields]}
                          fieldName={fieldName}
                          confidentlyExtracted={result.parsed.confidently_extracted}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Token usage */}
        {result.usage && (
          <Card className="bg-muted/50 border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>Prompt tokens: {result.usage.prompt_tokens.toLocaleString()}</span>
                <span>Completion tokens: {result.usage.completion_tokens.toLocaleString()}</span>
                <span className="font-semibold">Cost: ${result.usage.estimated_cost.toFixed(4)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-8">
          <Button onClick={handleDownloadJSON} className="gap-2">
            <Download className="h-4 w-4" /> Download JSON
          </Button>
          <Button variant="outline" onClick={handleReset}>
            Parse Another
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Lease Parser</h1>
        <p className="text-base text-muted-foreground">
          Upload a lease document and we'll extract key terms, tenant info, rent structure, and more.
        </p>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" /> Upload Lease Document
          </CardTitle>
          <CardDescription>Supports PDF, TXT, CSV, and XLSX files</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedFile ? (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Ready
                </Badge>
              </div>
            </div>
          ) : (
            <DropZone onFileSelected={handleFileSelected} loading={loading} />
          )}

          {selectedFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFile(null)}
              disabled={loading}
              className="w-full"
            >
              Choose Different File
            </Button>
          )}

          <Button
            onClick={handleParse}
            disabled={!selectedFile || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing lease...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Parse Lease
              </>
            )}
          </Button>

          {loading && (
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground text-center">
                This may take 5-15 seconds. Please wait...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 rounded-lg border border-border/50 bg-card/50 p-6 text-sm text-muted-foreground">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground mb-1">What gets extracted?</p>
            <p>The parser extracts 24 key fields including tenant info, property details, lease terms, rent structure, expense allocation, renewal/termination options, and extraction confidence scores.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
