import { useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileText, Image as ImageIcon, File as FileIcon, FileSpreadsheet,
  Download, Eye, Trash2, Loader2,
} from "lucide-react";
import {
  listDealFiles, uploadDealFile, getFileDownloadUrl, deleteFile,
  DealFile, FileCategory, FILE_CATEGORIES, CATEGORY_LABEL, CATEGORY_CLASS,
  formatFileSize, fileIconType,
} from "@/lib/filesApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { timeAgo } from "@/lib/tasksApi";

interface Props { dealId: string; }

function FileTypeIcon({ kind }: { kind: ReturnType<typeof fileIconType> }) {
  const cls = "h-5 w-5";
  if (kind === "pdf") return <FileText className={cn(cls, "text-rose-600")} />;
  if (kind === "word") return <FileText className={cn(cls, "text-blue-600")} />;
  if (kind === "excel") return <FileSpreadsheet className={cn(cls, "text-emerald-600")} />;
  if (kind === "image") return <ImageIcon className={cn(cls, "text-violet-600")} />;
  return <FileIcon className={cn(cls, "text-muted-foreground")} />;
}

export default function DealFilesTab({ dealId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<FileCategory>("other");
  const [uploadNotes, setUploadNotes] = useState("");
  const [filterCategory, setFilterCategory] = useState<FileCategory | "_all">("_all");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");

  const { data: files = [], isLoading, error } = useQuery({
    queryKey: ["deal-files", dealId],
    queryFn: () => listDealFiles(dealId),
    enabled: !!dealId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["deal-files", dealId] });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadDealFile(dealId, file, uploadCategory, uploadNotes || undefined),
    onSuccess: () => { invalidate(); setUploadNotes(""); toast({ title: "File uploaded" }); },
    onError: (e: Error) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => { invalidate(); toast({ title: "File deleted" }); },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList).forEach((f) => uploadMut.mutate(f));
  };

  const onDownload = async (file: DealFile) => {
    try {
      const { url } = await getFileDownloadUrl(file.id);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.target = "_blank";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    }
  };

  const onView = async (file: DealFile) => {
    try {
      const { url } = await getFileDownloadUrl(file.id);
      const kind = fileIconType(file.file_type, file.filename);
      if (kind === "pdf" || kind === "image") {
        setPreviewUrl(url);
        setPreviewName(file.filename);
      } else {
        window.open(url, "_blank", "noopener");
      }
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    }
  };

  const filtered = useMemo(() => {
    let list = filterCategory === "_all" ? files : files.filter((f) => f.category === filterCategory);
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.filename.localeCompare(b.filename);
      if (sortBy === "size") return b.file_size - a.file_size;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return list;
  }, [files, filterCategory, sortBy]);

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border bg-card",
        )}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
        <p className="text-sm text-foreground font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">PDFs, Word, Excel, images</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Select value={uploadCategory} onValueChange={(v) => setUploadCategory(v as FileCategory)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Notes (optional)"
            value={uploadNotes}
            onChange={(e) => setUploadNotes(e.target.value)}
            className="h-8 w-56 text-xs"
          />
          <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploadMut.isPending}>
            {uploadMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
          <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All categories</SelectItem>
            {FILE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Newest</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading files...</p>}
      {error && <p className="text-sm text-destructive">Failed to load files: {(error as Error).message}</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <FileIcon className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No files yet -- upload documents to keep everything in one place</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((f) => {
          const kind = fileIconType(f.file_type, f.filename);
          return (
            <div key={f.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 hover:bg-muted/40 transition-colors">
              <FileTypeIcon kind={kind} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{f.filename}</p>
                  <Badge className={cn("text-[10px] border-transparent", CATEGORY_CLASS[f.category])}>
                    {CATEGORY_LABEL[f.category]}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(f.file_size)} · {timeAgo(f.created_at)}
                  {f.uploader_name ? ` · ${f.uploader_name}` : ""}
                </p>
                {f.notes && <p className="text-[11px] text-muted-foreground italic mt-0.5">{f.notes}</p>}
              </div>
              <div className="flex items-center gap-1">
                {(kind === "pdf" || kind === "image") && (
                  <Button variant="ghost" size="sm" onClick={() => onView(f)} title="View">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => onDownload(f)} title="Download">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this file?</AlertDialogTitle>
                      <AlertDialogDescription>{f.filename} will be permanently removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMut.mutate(f.id)}
                      >Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={(o) => !o && setPreviewUrl(null)}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-2 border-b">
            <DialogTitle className="text-sm">{previewName}</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} title={previewName} className="flex-1 w-full" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
