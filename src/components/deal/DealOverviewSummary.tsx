import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckSquare, MessageSquare, FileText, Plus, Upload, RefreshCw, ArrowRight } from "lucide-react";
import { listDealTasks, listDealNotes, PRIORITY_CLASS, PRIORITY_LABEL, timeAgo } from "@/lib/tasksApi";
import { listDealFiles, fileIconType, formatFileSize, CATEGORY_LABEL } from "@/lib/filesApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  dealId: string;
  onGotoTab: (tab: "tasks" | "notes" | "files" | "versions") => void;
}

export default function DealOverviewSummary({ dealId, onGotoTab }: Props) {
  const { data: tasks = [] } = useQuery({
    queryKey: ["deal-tasks-overview", dealId],
    queryFn: () => listDealTasks(dealId),
    enabled: !!dealId,
  });
  const { data: notes = [] } = useQuery({
    queryKey: ["deal-notes-overview", dealId],
    queryFn: () => listDealNotes(dealId),
    enabled: !!dealId,
  });
  const { data: files = [] } = useQuery({
    queryKey: ["deal-files-overview", dealId],
    queryFn: () => listDealFiles(dealId),
    enabled: !!dealId,
  });

  const openTasks = tasks.filter((t) => t.status !== "done").slice(0, 5);
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).slice(0, 3);
  const recentFiles = [...files]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Left: tasks + notes (60%) */}
      <div className="lg:col-span-3 space-y-4">
        {/* Open tasks */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-muted-foreground" /> Open Tasks
            </h3>
            <button onClick={() => onGotoTab("tasks")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {openTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-center">
              <p className="text-xs text-muted-foreground mb-2">No open tasks</p>
              <Button size="sm" variant="outline" onClick={() => onGotoTab("tasks")}>
                <Plus className="h-3.5 w-3.5" /> Add task
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {openTasks.map((t) => (
                <div key={t.id} className="rounded-lg border border-border p-2.5 flex items-center gap-2 hover:bg-muted/40 transition-colors">
                  <Badge className={cn("text-[10px] border-transparent", PRIORITY_CLASS[t.priority])}>
                    {PRIORITY_LABEL[t.priority]}
                  </Badge>
                  <p className="text-sm flex-1 truncate">{t.title}</p>
                  {t.due_date && (
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(t.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent notes */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-muted-foreground" /> Recent Notes
            </h3>
            <button onClick={() => onGotoTab("notes")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {sortedNotes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-center">
              <p className="text-xs text-muted-foreground mb-2">No notes yet</p>
              <Button size="sm" variant="outline" onClick={() => onGotoTab("notes")}>
                <Plus className="h-3.5 w-3.5" /> Add note
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedNotes.map((n) => (
                <div key={n.id} className={cn("rounded-lg border p-3", n.is_pinned ? "bg-amber-50/40 border-amber-200" : "border-border")}>
                  <p className="text-sm whitespace-pre-wrap line-clamp-3">{n.content}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {n.author_name ?? "User"} · {timeAgo(n.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Right: quick actions + recent files (40%) */}
      <div className="lg:col-span-2 space-y-4">
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-2">
            <Button size="sm" variant="outline" onClick={() => onGotoTab("versions")}>
              <RefreshCw className="h-3.5 w-3.5" /> Run Analysis
            </Button>
            <Button size="sm" variant="outline" onClick={() => onGotoTab("files")}>
              <Upload className="h-3.5 w-3.5" /> Upload File
            </Button>
            <Button size="sm" variant="outline" onClick={() => onGotoTab("tasks")}>
              <Plus className="h-3.5 w-3.5" /> Add Task
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-muted-foreground" /> Recent Files
            </h3>
            <button onClick={() => onGotoTab("files")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {recentFiles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-center">
              <p className="text-xs text-muted-foreground mb-2">No files uploaded</p>
              <Button size="sm" variant="outline" onClick={() => onGotoTab("files")}>
                <Upload className="h-3.5 w-3.5" /> Upload
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentFiles.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onGotoTab("files")}
                  className="w-full text-left rounded-lg border border-border p-2.5 flex items-center gap-2 hover:bg-muted/40 transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{f.filename}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {CATEGORY_LABEL[f.category]} · {formatFileSize(f.file_size)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
