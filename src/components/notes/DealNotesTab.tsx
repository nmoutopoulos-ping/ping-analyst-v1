import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pin, PinOff, Trash2, MessageSquare, Reply } from "lucide-react";
import { listDealNotes, createNote, updateNote, deleteNote, DealNote, timeAgo } from "@/lib/tasksApi";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props { dealId: string; }

export default function DealNotesTab({ dealId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ["deal-notes", dealId],
    queryFn: () => listDealNotes(dealId),
    enabled: !!dealId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["deal-notes", dealId] });

  const createMut = useMutation({
    mutationFn: (input: { content: string; parent_note_id?: string | null }) => createNote(dealId, input),
    onSuccess: () => { invalidate(); setContent(""); setReplyContent(""); setReplyTo(null); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { is_pinned?: boolean; content?: string } }) => updateNote(id, patch),
    onSuccess: invalidate,
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: () => { invalidate(); toast({ title: "Note deleted" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // Build threaded structure
  const topLevel = notes.filter((n) => !n.parent_note_id);
  const childrenOf = (id: string) => notes.filter((n) => n.parent_note_id === id);
  const sorted = [...topLevel].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const NoteItem = ({ note, depth = 0 }: { note: DealNote; depth?: number }) => (
    <div className={depth > 0 ? "ml-6 border-l-2 border-border pl-3 mt-2" : ""}>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {note.is_pinned && <Pin className="h-3 w-3 text-amber-600 fill-amber-600" />}
            <span className="font-medium text-foreground">{note.author_name ?? "User"}</span>
            <span>{timeAgo(note.created_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateMut.mutate({ id: note.id, patch: { is_pinned: !note.is_pinned } })}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
              title={note.is_pinned ? "Unpin" : "Pin"}
            >
              {note.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-1 rounded hover:bg-muted text-muted-foreground" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteMut.mutate(note.id)}
                  >Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
        <div className="mt-2">
          <button
            onClick={() => setReplyTo(replyTo === note.id ? null : note.id)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Reply className="h-3 w-3" /> Reply
          </button>
        </div>
        {replyTo === note.id && (
          <div className="mt-2 space-y-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setReplyTo(null); setReplyContent(""); }}>Cancel</Button>
              <Button
                size="sm"
                disabled={!replyContent.trim() || createMut.isPending}
                onClick={() => createMut.mutate({ content: replyContent.trim(), parent_note_id: note.id })}
              >Reply</Button>
            </div>
          </div>
        )}
      </div>
      {childrenOf(note.id).map((child) => <NoteItem key={child.id} note={child} depth={depth + 1} />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!content.trim() || createMut.isPending}
            onClick={() => createMut.mutate({ content: content.trim() })}
          >
            {createMut.isPending ? "Saving..." : "Add Note"}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading notes...</p>}
      {error && <p className="text-sm text-destructive">Failed to load notes: {(error as Error).message}</p>}

      {!isLoading && notes.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No notes yet -- add the first one</p>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((n) => <NoteItem key={n.id} note={n} />)}
      </div>
    </div>
  );
}
