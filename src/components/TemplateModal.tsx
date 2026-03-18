import { useEffect, useState, useRef, useCallback } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Template, UnitCombo, CommercialSpace, AssumptionTemplate } from "@/lib/types";
import { getApiKey } from "@/lib/api";
import { supabaseGetAssumptionTemplates } from "@/lib/supabase";

const UNIT_ROWS = [
  { label: "Studio", bed: 0 },
  { label: "Single", bed: 1 },
  { label: "Duplex", bed: 2 },
  { label: "Triplex", bed: 3 },
  { label: "Fourplex", bed: 4 },
  { label: "Fiveplex", bed: 5 },
];
const BATH_COLS = [1, 2, 3, 4, 5];

interface Props {
  open: boolean;
  template?: Template | null;
  onClose: () => void;
  onSave: (data: Partial<Template>) => Promise<void>;
  onSaveAndRun?: (data: Partial<Template>) => Promise<void>;
}

function comboKey(bed: number, bath: number) {
  return `${bed}-${bath}`;
}

export default function TemplateModal({ open, template, onClose, onSave, onSaveAndRun }: Props) {
  const isNew = !template;

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [price, setPrice] = useState<string>("");
  const [improvements, setImprovements] = useState<string>("");
  const [sqft, setSqft] = useState<string>("");
  const [selectedCombos, setSelectedCombos] = useState<Set<string>>(new Set());
  const [unitCounts, setUnitCounts] = useState<Record<string, number>>({});
  const [radius, setRadius] = useState<string>("0.5");
  const [minComps, setMinComps] = useState<string>("");
  const [maxComps, setMaxComps] = useState<string>("");
  const [commercialEnabled, setCommercialEnabled] = useState(false);
  const [commercialSpaces, setCommercialSpaces] = useState<CommercialSpace[]>([]);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [assumptionTemplates, setAssumptionTemplates] = useState<AssumptionTemplate[]>([]);
  const [selectedAssumptionId, setSelectedAssumptionId] = useState<string>("");
  const [validationError, setValidationError] = useState("");

  const geocodeAddress = useCallback(async (addr: string) => {
    if (addr.trim().length < 5) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addr)}`,
        { headers: { "User-Agent": "PingAnalyst/3.0" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
      } else {
        setLat(undefined);
        setLng(undefined);
      }
    } catch {
      // geocode failed silently
    } finally {
      setGeocoding(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setLat(undefined);
    setLng(undefined);
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocodeAddress(value), 800);
  };

  useEffect(() => {
    if (open) {
      supabaseGetAssumptionTemplates(getApiKey()!)
        .then((tpls) => {
          setAssumptionTemplates(tpls);
          const def = tpls.find((t) => t.is_default);
          if (def) setSelectedAssumptionId(def.id);
        })
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (template) {
      setName(template.name || "");
      setAddress(template.address || "");
      setLat(template.lat);
      setLng(template.lng);
      setPrice(template.price?.toString() || "");
      setImprovements(template.improvements?.toString() || "");
      setSqft(template.sqft?.toString() || "");
      setRadius(template.radius?.toString() || "0.5");
      setMinComps(template.min_comps?.toString() || "");
      setMaxComps(template.max_comps?.toString() || "");
      const combos = new Set<string>();
      const counts: Record<string, number> = {};
      (template.combos || []).forEach((c) => {
        const k = comboKey(c.bed, c.bath);
        combos.add(k);
        counts[k] = c.units;
      });
      setSelectedCombos(combos);
      setUnitCounts(counts);
      setCommercialEnabled((template.commercial_spaces || []).length > 0);
      setCommercialSpaces(template.commercial_spaces || []);
    } else {
      setName("");
      setAddress("");
      setLat(undefined);
      setLng(undefined);
      setPrice("");
      setImprovements("");
      setSqft("");
      setSelectedCombos(new Set());
      setUnitCounts({});
      setRadius("0.5");
      setMinComps("");
      setMaxComps("");
      setCommercialEnabled(false);
      setCommercialSpaces([]);
      setSelectedAssumptionId("");
      setValidationError("");
    }
  }, [template, open]);

  if (!open) return null;

  const toggleCombo = (bed: number, bath: number) => {
    const k = comboKey(bed, bath);
    const next = new Set(selectedCombos);
    if (next.has(k)) {
      next.delete(k);
      const nextCounts = { ...unitCounts };
      delete nextCounts[k];
      setUnitCounts(nextCounts);
    } else {
      next.add(k);
      setUnitCounts((prev) => ({ ...prev, [k]: 1 }));
    }
    setSelectedCombos(next);
  };

  const totalUnits = Object.values(unitCounts).reduce((a, b) => a + b, 0);

  const buildData = (): Partial<Template> => {
    const combos: UnitCombo[] = [];
    selectedCombos.forEach((k) => {
      const [bed, bath] = k.split("-").map(Number);
      combos.push({ bed, bath, units: unitCounts[k] || 1 });
    });
    return {
      name,
      address,
      lat,
      lng,
      price: price ? Number(price) : undefined,
      improvements: improvements ? Number(improvements) : undefined,
      sqft: sqft ? Number(sqft) : undefined,
      combos,
      total_units: totalUnits,
      radius: radius ? Number(radius) : undefined,
      min_comps: minComps ? Number(minComps) : undefined,
      max_comps: maxComps ? Number(maxComps) : undefined,
      commercial_spaces: commercialEnabled ? commercialSpaces : undefined,
      assumption_template_id: selectedAssumptionId || undefined,
    } as Partial<Template> & { assumption_template_id?: string };
  };



  const validate = (): boolean => {
    if (!address.trim()) {
      setValidationError("Address is required.");
      return false;
    }
    if (selectedCombos.size === 0) {
      setValidationError("Select at least one unit type.");
      return false;
    }
    if (totalUnits === 0) {
      setValidationError("Total units must be greater than 0.");
      return false;
    }
    setValidationError("");
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(buildData());
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndRun = async () => {
    if (!onSaveAndRun) return;
    if (!validate()) return;
    setSaving(true);
    try {
      await onSaveAndRun(buildData());
    } finally {
      setSaving(false);
    }
  };

  const addCommercialRow = () => {
    setCommercialSpaces((prev) => [
      ...prev,
      { space_type: "Retail", sqft: 0, price_per_sqft: 0, annual_revenue: 0 },
    ]);
  };

  const updateCommercialRow = (idx: number, field: string, value: string | number) => {
    setCommercialSpaces((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const updated = { ...row, [field]: value };
        if (field === "sqft" || field === "price_per_sqft") {
          updated.annual_revenue = (Number(updated.sqft) || 0) * (Number(updated.price_per_sqft) || 0);
        }
        return updated;
      })
    );
  };

  const removeCommercialRow = (idx: number) => {
    setCommercialSpaces((prev) => prev.filter((_, i) => i !== idx));
  };

  const bedLabel = (bed: number) => UNIT_ROWS.find((r) => r.bed === bed)?.label || `${bed}bd`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative flex h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex-1">
            <div className="label-uppercase mb-1">Template Name</div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Austin 8-Unit MF"
              className="text-base font-semibold"
            />
          </div>
          <button onClick={onClose} className="ml-4 rounded-md p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <ScrollArea className="flex-1 px-6 py-5">
          <div className="space-y-8 pb-4">
            {/* Section 1: Property Info */}
            <section>
              <h3 className="label-uppercase mb-3">Property Information</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">PROPERTY ADDRESS *</Label>
                  <Input value={address} onChange={(e) => handleAddressChange(e.target.value)} placeholder="123 Main St, Austin TX" />
                </div>
                {geocoding && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Geocoding…
                  </div>
                )}
                {!geocoding && lat != null && lng != null && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-700">
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">PRICE (optional)</Label>
                    <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">IMPROVEMENTS (optional)</Label>
                    <Input type="number" value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">BUILDING SQFT (optional)</Label>
                    <Input type="number" value={sqft} onChange={(e) => setSqft(e.target.value)} placeholder="0" />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Unit Mix */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="label-uppercase">Unit Mix *</h3>
                <Badge className="bg-accent/10 text-accent border-0 text-xs">{selectedCombos.size} Selected</Badge>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Type</th>
                      {BATH_COLS.map((b) => (
                        <th key={b} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{b}BA</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {UNIT_ROWS.map((row) => (
                      <tr key={row.bed} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-xs font-medium text-foreground">
                          {row.label} ({row.bed}bd)
                        </td>
                        {BATH_COLS.map((bath) => (
                          <td key={bath} className="px-3 py-2 text-center">
                            <Checkbox
                              checked={selectedCombos.has(comboKey(row.bed, bath))}
                              onCheckedChange={() => toggleCombo(row.bed, bath)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3: Units per type */}
            {selectedCombos.size > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="label-uppercase">Units Per Type</h3>
                  <span className="text-xs font-semibold text-muted-foreground">{totalUnits} Total</span>
                </div>
                <div className="space-y-2">
                  {Array.from(selectedCombos).map((k) => {
                    const [bed, bath] = k.split("-").map(Number);
                    return (
                      <div key={k} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2">
                        <span className="text-sm text-foreground">
                          {bedLabel(bed)} {bed}bd/{bath}ba
                        </span>
                        <Input
                          type="number"
                          min={1}
                          value={unitCounts[k] ?? 1}
                          onChange={(e) => setUnitCounts((prev) => ({ ...prev, [k]: Number(e.target.value) || 0 }))}
                          className="w-20 text-center"
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Assumption Template Picker */}
            <section>
              <h3 className="label-uppercase mb-3">Assumptions</h3>
              <Select value={selectedAssumptionId} onValueChange={setSelectedAssumptionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Use default assumptions" />
                </SelectTrigger>
                <SelectContent>
                  {assumptionTemplates.map((at) => (
                    <SelectItem key={at.id} value={at.id}>
                      {at.name} {at.is_default ? "⭐" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAssumptionId && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  These assumptions will be used for this analysis run.
                </p>
              )}
            </section>

            {/* Section 4: Search Parameters */}
            <section>
              <h3 className="label-uppercase mb-3">Search Parameters</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">RADIUS (mi)</Label>
                  <Input type="number" step="0.1" value={radius} onChange={(e) => setRadius(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">MIN COMPS</Label>
                  <Input type="number" value={minComps} onChange={(e) => setMinComps(e.target.value)} placeholder="—" />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground">MAX COMPS</Label>
                  <Input type="number" value={maxComps} onChange={(e) => setMaxComps(e.target.value)} placeholder="—" />
                </div>
              </div>
            </section>

            {/* Section 5: Commercial */}
            <section>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="label-uppercase">Commercial Spaces</h3>
                <Switch checked={commercialEnabled} onCheckedChange={setCommercialEnabled} />
              </div>
              {commercialEnabled && (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Space Type</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">SQ FT</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">$/SF/YR</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">ANN. REV</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {commercialSpaces.map((row, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0">
                            <td className="px-3 py-2">
                              <Select value={row.space_type} onValueChange={(v) => updateCommercialRow(idx, "space_type", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["Retail", "Office", "Industrial", "Mixed"].map((t) => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" className="h-8 text-xs" value={row.sqft || ""} onChange={(e) => updateCommercialRow(idx, "sqft", Number(e.target.value))} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" className="h-8 text-xs" value={row.price_per_sqft || ""} onChange={(e) => updateCommercialRow(idx, "price_per_sqft", Number(e.target.value))} />
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                              ${row.annual_revenue.toLocaleString()}
                            </td>
                            <td className="px-2 py-2">
                              <button onClick={() => removeCommercialRow(idx)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button variant="outline" size="sm" onClick={addCommercialRow}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Space
                  </Button>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-border px-6 py-4">
          {validationError && (
            <p className="text-sm text-destructive">{validationError}</p>
          )}
          <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => { setValidationError(""); onClose(); }} disabled={saving}>Cancel</Button>
          {isNew && onSaveAndRun && (
            <Button onClick={handleSaveAndRun} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? "Saving…" : "Save & Run"}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Template"}
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
