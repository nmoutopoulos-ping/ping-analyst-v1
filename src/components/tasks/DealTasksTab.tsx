import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare } from "lucide-react";
import {
  listDealTasks, createTask, updateTask, deleteTask,
  DealTask, TaskFilters, TaskStatus, TaskPriority, DealStage,
  PRIORITY_LABEL, STATUS_LABEL, DEAL_STAGES, CreateTaskInput,
} from "@/lib/tasksApi";
import TaskCard from "./TaskCard";
import TaskQuickCreate from "./TaskQuickCreate";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Props {
  dealId: string; // uuid
}

export default function DealTasksTab({ dealId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState<TaskFilters>({});

  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ["deal-tasks", dealId, filters],
    queryFn: () => listDealTasks(dealId, filters),
    enabled: !!dealId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["deal-tasks", dealId] });

  const createMut = useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input, dealId),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Failed to create task", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DealTask> }) =>
      updateTask(id, patch as Partial<CreateTaskInput>),
    onSuccess: () => { invalidate(); },
    onError: (e: Error) => toast({ title: "Failed to update task", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => { invalidate(); toast({ title: "Task deleted" }); },
    onError: (e: Error) => toast({ title: "Failed to delete", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={filters.status ?? "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "_all" ? undefined : (v as TaskStatus) }))}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {(["todo","in_progress","done"] as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.priority ?? "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "_all" ? undefined : (v as TaskPriority) }))}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All priorities</SelectItem>
            {(["low","medium","high","urgent"] as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.deal_stage ?? "_all"} onValueChange={(v) => setFilters((f) => ({ ...f, deal_stage: v === "_all" ? undefined : (v as DealStage) }))}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All stages</SelectItem>
            {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <TaskQuickCreate onCreate={(input) => createMut.mutateAsync(input)} />

      {isLoading && <p className="text-sm text-muted-foreground">Loading tasks...</p>}
      {error && <p className="text-sm text-destructive">Failed to load tasks: {(error as Error).message}</p>}

      {!isLoading && tasks.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No tasks yet -- add one to get started</p>
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onUpdate={(patch) => updateMut.mutate({ id: t.id, patch })}
            onDelete={() => deleteMut.mutate(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
