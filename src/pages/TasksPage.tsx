import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List as ListIcon, ExternalLink, Plus } from "lucide-react";
import {
  listTasks, createTask, updateTask, deleteTask,
  DealTask, TaskFilters, TaskStatus, TaskPriority, DealStage,
  PRIORITY_LABEL, PRIORITY_CLASS, STATUS_LABEL, DEAL_STAGES, CreateTaskInput,
} from "@/lib/tasksApi";
import TaskCard from "@/components/tasks/TaskCard";
import TaskQuickCreate from "@/components/tasks/TaskQuickCreate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getApiKey } from "@/lib/api";
import { supabaseGetDeals } from "@/lib/supabase";

type ViewMode = "kanban" | "list";

export default function TasksPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<TaskFilters>({});
  const [view, setView] = useState<ViewMode>("kanban");

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["tasks-global", filters],
    queryFn: () => listTasks(filters),
  });

  const { data: deals = [] } = useQuery({
    queryKey: ["deals-list-for-tasks"],
    queryFn: async () => {
      const k = getApiKey();
      if (!k) return [];
      return supabaseGetDeals(k);
    },
  });

  const dealNameById = useMemo(() => {
    const m = new Map<string, { name: string; search_id: string }>();
    for (const d of deals as any[]) {
      if (d.id) m.set(d.id, { name: d.address ?? d.search_id, search_id: d.search_id });
    }
    return m;
  }, [deals]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks-global"] });

  const createMut = useMutation({
    mutationFn: ({ input, dealId }: { input: CreateTaskInput; dealId: string | null }) => createTask(input, dealId),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DealTask> }) => updateTask(id, patch as Partial<CreateTaskInput>),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const [newDealId, setNewDealId] = useState<string>("_none");

  const dealLink = (deal_id: string | null) => {
    if (!deal_id) return <Badge variant="outline" className="text-[10px]">Global</Badge>;
    const d = dealNameById.get(deal_id);
    if (!d) return null;
    return (
      <Link to={`/deals/${d.search_id}`} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
        <ExternalLink className="h-2.5 w-2.5" />{d.name}
      </Link>
    );
  };

  const columns: { key: TaskStatus; title: string }[] = [
    { key: "todo", title: "To Do" },
    { key: "in_progress", title: "In Progress" },
    { key: "done", title: "Done" },
  ];

  const grouped: Record<TaskStatus, DealTask[]> = { todo: [], in_progress: [], done: [] };
  for (const t of tasks) grouped[t.status]?.push(t);

  return (
    <div className="max-w-7xl px-6 py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">All tasks across your deals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === "kanban" ? "default" : "outline"} size="sm"
            onClick={() => setView("kanban")}
          ><LayoutGrid className="h-4 w-4 mr-1" />Board</Button>
          <Button
            variant={view === "list" ? "default" : "outline"} size="sm"
            onClick={() => setView("list")}
          ><ListIcon className="h-4 w-4 mr-1" />List</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Select value={filters.status ?? "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "_all" ? undefined : (v as TaskStatus) }))}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {(["todo","in_progress","done"] as TaskStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.priority ?? "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "_all" ? undefined : (v as TaskPriority) }))}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All priorities</SelectItem>
            {(["low","medium","high","urgent"] as TaskPriority[]).map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.deal_stage ?? "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, deal_stage: v === "_all" ? undefined : (v as DealStage) }))}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All stages</SelectItem>
            {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.deal_id ?? "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, deal_id: v === "_all" ? undefined : v }))}>
          <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Deal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All deals</SelectItem>
            {(deals as any[]).filter((d) => d.id).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.address ?? d.search_id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Add task */}
      <Card className="mb-4 p-3 space-y-2">
        <div className="text-xs text-muted-foreground">New task -- attach to deal (optional)</div>
        <Select value={newDealId} onValueChange={setNewDealId}>
          <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">No deal (global task)</SelectItem>
            {(deals as any[]).filter((d) => d.id).map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.address ?? d.search_id}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TaskQuickCreate onCreate={async (input) => {
          await createMut.mutateAsync({ input, dealId: newDealId === "_none" ? null : newDealId });
        }} />
      </Card>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-destructive">Failed: {(error as Error).message}</p>}

      {view === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.key} className="rounded-lg bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">{col.title}</h3>
                <span className="text-xs text-muted-foreground">{grouped[col.key].length}</span>
              </div>
              <div className="space-y-2">
                {grouped[col.key].map((t) => (
                  <div key={t.id} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={cn("text-[10px] px-1.5 py-0 border-transparent", PRIORITY_CLASS[t.priority])}>
                        {PRIORITY_LABEL[t.priority]}
                      </Badge>
                      {dealLink(t.deal_id)}
                    </div>
                    <p className="text-sm font-medium">{t.title}</p>
                    {t.due_date && <p className="text-[11px] text-muted-foreground mt-1">Due {new Date(t.due_date).toLocaleDateString()}</p>}
                    <div className="mt-2 flex gap-1">
                      {(["todo","in_progress","done"] as TaskStatus[]).filter((s) => s !== t.status).map((s) => (
                        <button
                          key={s}
                          onClick={() => updateMut.mutate({ id: t.id, patch: { status: s } })}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/70 text-muted-foreground"
                        >→ {STATUS_LABEL[s]}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {grouped[col.key].length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onUpdate={(patch) => updateMut.mutate({ id: t.id, patch })}
              onDelete={() => deleteMut.mutate(t.id)}
              showDealLink={dealLink(t.deal_id)}
            />
          ))}
          {!isLoading && tasks.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <Plus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No tasks yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
