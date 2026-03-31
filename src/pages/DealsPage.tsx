import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Settings, MapPin, GripVertical, Archive, X } from "lucide-react";
import { getApiKey } from "@/lib/api";
import { supabaseGetDeals, supabaseGetArchivedDeals, getDealImageUrl, supabaseUpdateDealStage } from "@/lib/supabase";
import { Deal } from "@/lib/types";
import { KanbanColumn, getColumns, saveColumns } from "@/lib/kanbanColumns";
import KanbanSettingsPanel from "@/components/KanbanSettingsPanel";
import StageBadge from "@/components/StageBadge";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatPrice(n?: number) {
  if (!n) return "â";
  return "$" + n.toLocaleString();
}

/* ââ Draggable Deal Card ââ */
function DealCard({ deal, navigate, isDragging }: { deal: Deal; navigate: (path: string) => void; isDragging?: boolean }) {
  return (
    <div
      className={`w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-shadow duration-150 ${isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md"}`}
    >
        {getDealImageUrl(deal) && (
          <div className="w-full h-32 overflow-hidden rounded-t-lg -mt-3 -mx-3 mb-2" style={{width: "calc(100% + 1.5rem)"}}>
            <img src={getDealImageUrl(deal)} alt={deal.address} className="w-full h-full object-cover" />
          </div>
        )}
      <div className="label-uppercase text-accent">SEARCH ID</div>
      <p className="font-mono text-sm font-semibold text-foreground">{deal.search_id}</p>
      <p className="text-xs text-muted-foreground">{formatDate(deal.created_at)}</p>

      <div className="mt-3 flex items-start gap-1.5">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
        <div>
          <div className="label-uppercase">Property</div>
          <p className="text-sm text-foreground">{deal.short_address || deal.address}</p>
        </div>
      </div>

      <div className="mt-3 flex gap-6">
        <div>
          <div className="label-uppercase">Units</div>
          <p className="text-sm font-medium text-foreground">{deal.search_meta?.total_units ?? "â"}</p>
        </div>
        <div>
          <div className="label-uppercase">$ Price</div>
          <p className="text-sm font-medium text-foreground">
            {formatPrice(deal.search_meta?.price || deal.search_meta?.listing_price)}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="label-uppercase">Status</div>
        <StageBadge stage={deal.stage} className="mt-1" />
      </div>
    </div>
  );
}

function SortableDealCard({ deal, navigate }: { deal: Deal; navigate: (path: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.search_id,
    data: { type: "deal", deal },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <button onClick={() => navigate(`/deals/${deal.search_id}`)} className="w-full">
        <DealCard deal={deal} navigate={navigate} isDragging={isDragging} />
      </button>
    </div>
  );
}

/* ââ Droppable Column ââ */
function DroppableColumn({
  col,
  deals,
  navigate,
}: {
  col: KanbanColumn;
  deals: Deal[];
  navigate: (path: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${col.id}`, data: { type: "column", col } });

  return (
    <div ref={setNodeRef} className={`min-h-[120px] ${isOver ? "rounded-xl ring-2 ring-accent/30" : ""}`}>
      <SortableContext items={deals.map((d) => d.search_id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {deals.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted-foreground">
              No deals
            </div>
          ) : (
            deals.map((deal) => <SortableDealCard key={deal.search_id} deal={deal} navigate={navigate} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/* ââ Sortable Column Header ââ */
function SortableColumnHeader({ col, count }: { col: KanbanColumn; count: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `colheader-${col.id}`,
    data: { type: "columnHeader", col },
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5" {...attributes} {...listeners}>
        <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground/50 hover:text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
      </div>
      <span
        className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold"
        style={{
          backgroundColor: `hsl(${col.color} / 0.15)`,
          color: `hsl(${col.color})`,
        }}
      >
        {count}
      </span>
    </div>
  );
}

/* ââ Main Page ââ */
export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState<KanbanColumn[]>(getColumns);
  const [showSettings, setShowSettings] = useState(false);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [showArchives, setShowArchives] = useState(false);
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const navigate = useNavigate();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn("[DealsPage] No apiKey found in localStorage");
      setError("No API key found. Please log out and log back in.");
      setLoading(false);
      return;
    }
    supabaseGetDeals(apiKey)
      .then((deals) => setDeals(deals))
      .catch(() => setError("Failed to load deals."))
      .finally(() => setLoading(false));
  }, []);

  const handleColumnsChange = useCallback((newCols: KanbanColumn[]) => {
    setColumns(newCols);
    saveColumns(newCols);
  }, []);

  const filtered = deals.filter(
    (d) =>
      d.address.toLowerCase().includes(search.toLowerCase()) ||
      d.search_id.toLowerCase().includes(search.toLowerCase())
  );

  const getColumnDeals = (col: KanbanColumn) =>
    filtered.filter((d) => col.stages.includes(d.stage));

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current;
    if (data?.type === "deal") setActiveDeal(data.deal);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = e;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Column reorder via headers
    if (activeData?.type === "columnHeader" && overData?.type === "columnHeader") {
      const oldIdx = columns.findIndex((c) => c.id === activeData.col.id);
      const newIdx = columns.findIndex((c) => c.id === overData.col.id);
      if (oldIdx !== newIdx) {
        handleColumnsChange(arrayMove(columns, oldIdx, newIdx));
      }
      return;
    }

    // Deal card dropped on a column or another deal
    if (activeData?.type === "deal") {
      const deal = activeData.deal as Deal;
      let targetCol: KanbanColumn | undefined;

      if (overData?.type === "column") {
        targetCol = overData.col as KanbanColumn;
      } else if (overData?.type === "deal") {
        // Find which column the target deal is in
        const overDeal = overData.deal as Deal;
        targetCol = columns.find((c) => c.stages.includes(overDeal.stage));
      } else if (over.id.toString().startsWith("column-")) {
        const colId = over.id.toString().replace("column-", "");
        targetCol = columns.find((c) => c.id === colId);
      }

      if (targetCol && !targetCol.stages.includes(deal.stage)) {
        const newStage = targetCol.stages[0] || targetCol.label;
        // Optimistic update
        setDeals((prev) =>
          prev.map((d) => (d.search_id === deal.search_id ? { ...d, stage: newStage } : d))
        );
        // Persist
        supabaseUpdateDealStage(deal.search_id, newStage).catch(() => {
          // Revert on error
          setDeals((prev) =>
            prev.map((d) => (d.search_id === deal.search_id ? { ...d, stage: deal.stage } : d))
          );
        });
      }
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    // Allow cross-column dragging
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">Deals</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All submitted analyses stored and secure.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex flex-1 items-center rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <Search className="mr-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by address or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`rounded-xl border border-border p-3 shadow-sm transition-colors ${showSettings ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
          title="Column settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {showSettings && (
        <div className="mt-4">
          <KanbanSettingsPanel
            columns={columns}
            onChange={handleColumnsChange}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {loading && <p className="mt-8 text-sm text-muted-foreground">Loadingâ¦</p>}
      {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

      {!loading && !error && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            className="mt-8 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
          >
            <SortableContext
              items={columns.map((c) => `colheader-${c.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              {columns.map((col) => {
                const colDeals = getColumnDeals(col);
                return (
                  <div key={col.id}>
                    <SortableColumnHeader col={col} count={colDeals.length} />
                    <DroppableColumn col={col} deals={colDeals} navigate={navigate} />
                  </div>
                );
              })}
            </SortableContext>
          </div>

          <DragOverlay>
            {activeDeal && <DealCard deal={activeDeal} navigate={navigate} isDragging />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
