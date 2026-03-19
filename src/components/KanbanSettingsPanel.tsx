import { useState } from "react";
import { Plus, Trash2, GripVertical, RotateCcw, X } from "lucide-react";
import { KanbanColumn, COLOR_PRESETS, resetColumns } from "@/lib/kanbanColumns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  columns: KanbanColumn[];
  onChange: (cols: KanbanColumn[]) => void;
  onClose: () => void;
}

function SortableColumnRow({
  col,
  onUpdate,
  onRemove,
  canRemove,
}: {
  col: KanbanColumn;
  onUpdate: (patch: Partial<KanbanColumn>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        value={col.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="h-8 flex-1 text-sm"
        placeholder="Column name"
      />

      <div className="flex gap-1">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onUpdate({ color: preset.value })}
            className={`h-5 w-5 rounded-full border-2 transition-transform ${
              col.color === preset.value ? "scale-125 border-foreground" : "border-transparent hover:scale-110"
            }`}
            style={{ backgroundColor: `hsl(${preset.value})` }}
            title={preset.name}
          />
        ))}
      </div>

      <button
        onClick={onRemove}
        disabled={!canRemove}
        className="text-muted-foreground hover:text-destructive disabled:opacity-30"
        title="Remove column"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function KanbanSettingsPanel({ columns, onChange, onClose }: Props) {
  const [cols, setCols] = useState<KanbanColumn[]>(columns);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const update = (newCols: KanbanColumn[]) => {
    setCols(newCols);
    onChange(newCols);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = cols.findIndex((c) => c.id === active.id);
    const newIdx = cols.findIndex((c) => c.id === over.id);
    update(arrayMove(cols, oldIdx, newIdx));
  };

  const addColumn = () => {
    const id = `col_${Date.now()}`;
    update([...cols, { id, label: "New Column", color: "215 16% 47%", stages: [id], order: cols.length }]);
  };

  const removeColumn = (id: string) => update(cols.filter((c) => c.id !== id));

  const updateColumn = (id: string, patch: Partial<KanbanColumn>) => {
    update(cols.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c, ...patch };
      // Keep stages in sync with label for new columns
      if (patch.label && c.stages.length === 1 && c.stages[0] === c.label) {
        updated.stages = [patch.label];
      }
      return updated;
    }));
  };

  const handleReset = () => {
    const defaults = resetColumns();
    setCols(defaults);
    onChange(defaults);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Kanban Columns</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 gap-1 text-xs text-muted-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cols.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {cols.map((col) => (
              <SortableColumnRow
                key={col.id}
                col={col}
                onUpdate={(patch) => updateColumn(col.id, patch)}
                onRemove={() => removeColumn(col.id)}
                canRemove={cols.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" onClick={addColumn} className="mt-3 w-full gap-1 text-xs">
        <Plus className="h-3 w-3" /> Add Column
      </Button>
    </div>
  );
}
