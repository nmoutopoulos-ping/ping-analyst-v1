import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Trash2, Tag, ChevronDown, ChevronRight } from "lucide-react";
import {
  DealTask, TaskStatus, TaskPriority, DealStage,
  PRIORITY_LABEL, PRIORITY_CLASS, STATUS_LABEL, DEAL_STAGES,
  isOverdue, timeAgo,
} from "@/lib/tasksApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Props {
  task: DealTask;
  onUpdate: (patch: Partial<DealTask>) => void;
  onDelete: () => void;
  showDealLink?: React.ReactNode;
  showStage?: boolean;
}

export default function TaskCard({ task, onUpdate, onDelete, showDealLink, showStage = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const overdue = isOverdue(task.due_date, task.status);

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next: TaskStatus =
      task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    onUpdate({ status: next });
  };

  const statusDot =
    task.status === "done" ? "bg-emerald-500"
    : task.status === "in_progress" ? "bg-amber-500"
    : "bg-muted-foreground/40";

  return (
    <div className={cn(
      "rounded-lg border border-border bg-card transition-colors",
      task.status === "done" && "opacity-60"
    )}>
      <div
        className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/30"
        onClick={() => setExpanded((v) => !v)}
      >
        <button
          onClick={cycleStatus}
          title={`Status: ${STATUS_LABEL[task.status]} (click to advance)`}
          className={cn("mt-1 h-4 w-4 rounded-full border-2 border-border shrink-0", statusDot)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-sm font-medium text-foreground",
              task.status === "done" && "line-through"
            )}>
              {task.title}
            </span>
            <Badge className={cn("text-[10px] px-1.5 py-0 border-transparent", PRIORITY_CLASS[task.priority])}>
              {PRIORITY_LABEL[task.priority]}
            </Badge>
            {showStage && task.deal_stage && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{task.deal_stage}</Badge>
            )}
            {task.due_date && (
              <span className={cn(
                "flex items-center gap-1 text-[11px]",
                overdue ? "text-rose-600 font-medium" : "text-muted-foreground"
              )}>
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
            {showDealLink}
          </div>
          {task.tags?.length > 0 && (
            <div className="mt-1.5 flex gap-1 flex-wrap">
              {task.tags.map((t) => (
                <span key={t} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="border-t border-border p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== task.title && onUpdate({ title })}
            placeholder="Title"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => description !== (task.description ?? "") && onUpdate({ description })}
            placeholder="Description (optional)"
            rows={3}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Status</label>
              <Select value={task.status} onValueChange={(v) => onUpdate({ status: v as TaskStatus })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["todo", "in_progress", "done"] as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Priority</label>
              <Select value={task.priority} onValueChange={(v) => onUpdate({ priority: v as TaskPriority })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Stage</label>
              <Select
                value={task.deal_stage ?? "_none"}
                onValueChange={(v) => onUpdate({ deal_stage: v === "_none" ? null : (v as DealStage) })}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">--</SelectItem>
                  {DEAL_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Due date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full h-8 justify-start text-xs font-normal">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {task.due_date ? format(new Date(task.due_date), "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={task.due_date ? new Date(task.due_date) : undefined}
                    onSelect={(d) => onUpdate({ due_date: d ? d.toISOString().slice(0, 10) : null })}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" /> Tags (comma-separated)
            </label>
            <Input
              defaultValue={task.tags?.join(", ") ?? ""}
              onBlur={(e) => {
                const tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
                onUpdate({ tags });
              }}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Updated {timeAgo(task.updated_at)}</span>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 text-xs text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
