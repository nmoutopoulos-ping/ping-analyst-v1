import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateTaskInput, TaskPriority, TaskStatus, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/tasksApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Props {
  onCreate: (input: CreateTaskInput) => Promise<void> | void;
}

export default function TaskQuickCreate({ onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await onCreate({ title: title.trim(), status, priority });
      setTitle("");
      setStatus("todo");
      setPriority("medium");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full justify-start">
        <Plus className="h-4 w-4 mr-1" /> Add task
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Task title..."
      />
      <div className="flex gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["todo", "in_progress", "done"] as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
              <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" onClick={submit} disabled={busy || !title.trim()}>
          {busy ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
