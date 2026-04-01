/**
 * DealPhotoGallery.tsx -- Photo gallery for a deal
 * -------------------------------------------------------------------
 * Users can upload image files (single or batch) or paste image URLs.
 * Supports:
 * - File upload (single + batch) to Supabase Storage
 * - Paste URL to add (multi-URL via newlines)
 * - Responsive grid with smooth hover effects
 * - Inline caption + label editing
 * - Lightbox for full-size viewing
 * - Drag-to-reorder via sort_order
 * - Delete with confirmation
 *
 * Props:
 *   dealId -- UUID of the deal (from deals.id)
 *   apiKey -- current user's api_key
 */
import { useState, useEffect, useRef, useCallback } from "react";
import type { DealPhoto } from "../lib/types";
import { PHOTO_LABELS } from "../lib/types";
import {
  supabaseGetDealPhotos,
  supabaseAddDealPhotoUrl,
  supabaseUploadDealPhoto,
  supabaseUpdateDealPhoto,
  supabaseDeleteDealPhoto,
  supabaseReorderDealPhotos,
} from "../lib/supabase";

// ââ Helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ââ Component ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface Props {
  dealId: string;
  apiKey: string;
}

export default function DealPhotoGallery({ dealId, apiKey }: Props) {
  const [photos, setPhotos] = useState<DealPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ââ Fetch photos âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const data = await supabaseGetDealPhotos(dealId);
    setPhotos(data);
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // ââ Add URL handler ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  async function handleAddUrl() {
    const urls = urlInput
      .split("\n")
      .map((s) => s.trim())
      .filter(isValidUrl);
    if (urls.length === 0) return;

    setAdding(true);
    const maxOrder =
      photos.length > 0 ? Math.max(...photos.map((p) => p.sort_order)) : -1;

    await Promise.all(
      urls.map((url, i) =>
        supabaseAddDealPhotoUrl(apiKey, dealId, url, {
          sortOrder: maxOrder + 1 + i,
        })
      )
    );
    setUrlInput("");
    setShowAddForm(false);
    await loadPhotos();
    setAdding(false);
  }

  // ââ Inline edit ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  // -- File upload handler ------------------------------------------------
  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const maxOrder = photos.length > 0
      ? Math.max(...photos.map((p) => p.sort_order))
      : -1;
    const fileArr = Array.from(files);
    for (let i = 0; i < fileArr.length; i++) {
      await supabaseUploadDealPhoto(apiKey, dealId, fileArr[i], {
        sortOrder: maxOrder + 1 + i,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadPhotos();
    setUploading(false);
  }

  async function saveEdit(photo: DealPhoto, caption: string, label: string) {
    await supabaseUpdateDealPhoto(photo.id, {
      caption: caption || undefined,
      label: label || undefined,
    });
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, caption, label } : p))
    );
    setEditingId(null);
  }

  // ââ Delete âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  async function handleDelete(photo: DealPhoto) {
    await supabaseDeleteDealPhoto(photo);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    setDeleteConfirm(null);
    if (lightboxIdx !== null) setLightboxIdx(null);
  }

  // ââ Reorder via drag âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  function onCardDragStart(idx: number) {
    setDragIdx(idx);
  }

  function onCardDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }

  async function onCardDrop(idx: number) {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...photos];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    const withOrder = reordered.map((p, i) => ({ ...p, sort_order: i }));
    setPhotos(withOrder);
    setDragIdx(null);
    setDragOverIdx(null);

    await supabaseReorderDealPhotos(
      withOrder.map((p) => ({ id: p.id, sort_order: p.sort_order }))
    );
  }

  // ââ Lightbox nav âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  function lightboxPrev() {
    if (lightboxIdx === null) return;
    setLightboxIdx(lightboxIdx > 0 ? lightboxIdx - 1 : photos.length - 1);
  }

  function lightboxNext() {
    if (lightboxIdx === null) return;
    setLightboxIdx(lightboxIdx < photos.length - 1 ? lightboxIdx + 1 : 0);
  }

  // ââ Keyboard nav for lightbox ââââââââââââââââââââââââââââââââââââââââââââââ

  useEffect(() => {
    if (lightboxIdx === null) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIdx, photos.length]);

  // ââ Render âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  const lightboxPhoto = lightboxIdx !== null ? photos[lightboxIdx] : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">
          Photos
          {photos.length > 0 && (
            <span className="ml-2 text-sm font-normal text-zinc-400">
              {photos.length} photo{photos.length !== 1 ? "s" : ""}
            </span>
          )}
        </h3>
        <button
          onClick={() => {
            setShowAddForm(true);
            setTimeout(() => urlInputRef.current?.focus(), 50);
          }}
          disabled={adding}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {adding ? (
            <>
              <Spinner /> Adding...
            </>
          ) : (
            <>
              <PlusIcon /> Add Photos
            </>
          )}
        </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Spinner />
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon />
                Upload Files
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
      </div>

      {/* Add URL form */}
      {showAddForm && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-4 space-y-3">
          <label className="block text-xs font-medium text-zinc-400">
            Paste image URL(s) â one per line
          </label>
          <input
            ref={urlInputRef}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            placeholder="https://example.com/photo.jpg"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setUrlInput("");
              }}
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAddUrl}
              disabled={adding || !urlInput.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
          <span className="ml-2 text-sm text-zinc-400">Loading photos...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/50 py-16 transition hover:border-blue-500/50 hover:bg-zinc-900">
          <CameraIcon />
          <p className="mt-3 text-sm text-zinc-400">
            No photos yet.{" "}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-400 underline underline-offset-2 hover:text-blue-300"
              >
                Upload files
              </button>
              {" or "}
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setTimeout(() => urlInputRef.current?.focus(), 50);
                }}
                className="text-blue-400 underline underline-offset-2 hover:text-blue-300"
              >
                paste a URL
              </button>
          </p>
        </div>
      )}

      {/* Photo grid */}
      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => onCardDragStart(idx)}
              onDragOver={(e) => onCardDragOver(e, idx)}
              onDrop={() => onCardDrop(idx)}
              onDragEnd={() => {
                setDragIdx(null);
                setDragOverIdx(null);
              }}
              className={`group relative overflow-hidden rounded-xl bg-zinc-900 transition-all cursor-grab active:cursor-grabbing ${
                dragOverIdx === idx ? "ring-2 ring-blue-500 scale-[1.02]" : ""
              } ${dragIdx === idx ? "opacity-40" : ""}`}
            >
              {/* Image */}
              <div
                className="aspect-[4/3] w-full cursor-pointer overflow-hidden"
                onClick={() => setLightboxIdx(idx)}
              >
                <img
                  src={photo.signed_url || photo.image_url || ""}
                  alt={photo.caption || photo.file_name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />

              {/* Label badge */}
              {photo.label && (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-zinc-200 backdrop-blur-sm">
                  {photo.label}
                </span>
              )}

              {/* Action buttons on hover */}
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(photo.id);
                  }}
                  className="rounded-lg bg-black/60 p-1.5 text-zinc-300 backdrop-blur-sm transition hover:bg-black/80 hover:text-white"
                  title="Edit"
                >
                  <EditIcon />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(photo.id);
                  }}
                  className="rounded-lg bg-black/60 p-1.5 text-zinc-300 backdrop-blur-sm transition hover:bg-red-600/80 hover:text-white"
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </div>

              {/* Caption footer */}
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-xs text-zinc-200">
                  {photo.caption || photo.file_name}
                </p>
              </div>
            </div>
          ))}

          {/* Add more tile */}
          <button
            onClick={() => {
              setShowAddForm(true);
              setTimeout(() => urlInputRef.current?.focus(), 50);
            }}
            disabled={adding}
            className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 text-zinc-500 transition hover:border-blue-500/50 hover:text-blue-400 disabled:opacity-50"
          >
            {adding ? <Spinner /> : <PlusIcon />}
            <span className="mt-1 text-xs">
              {adding ? "Adding..." : "Add more"}
            </span>
          </button>
        </div>
      )}

      {/* ââ Edit modal ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
      {editingId && (
        <EditModal
          photo={photos.find((p) => p.id === editingId)!}
          onSave={saveEdit}
          onCancel={() => setEditingId(null)}
        />
      )}

      {/* ââ Delete confirmation ââââââââââââââââââââââââââââââââââââââââââââââââ */}
      {deleteConfirm && (
        <ConfirmModal
          message="Delete this photo? This cannot be undone."
          onConfirm={() => {
            const photo = photos.find((p) => p.id === deleteConfirm);
            if (photo) handleDelete(photo);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* ââ Lightbox âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute right-4 top-4 rounded-full bg-zinc-800/80 p-2 text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
          >
            <CloseIcon />
          </button>

          {/* Nav arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-zinc-800/80 p-3 text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
              >
                <ChevronLeftIcon />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-zinc-800/80 p-3 text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
              >
                <ChevronRightIcon />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={lightboxPhoto.signed_url || lightboxPhoto.image_url || ""}
            alt={lightboxPhoto.caption || lightboxPhoto.file_name}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-zinc-900/80 px-6 py-3 text-center backdrop-blur-sm">
            {lightboxPhoto.label && (
              <span className="mr-2 rounded-full bg-blue-600/30 px-2.5 py-0.5 text-xs font-medium text-blue-300">
                {lightboxPhoto.label}
              </span>
            )}
            <span className="text-sm text-zinc-200">
              {lightboxPhoto.caption || lightboxPhoto.file_name}
            </span>
            <span className="ml-3 text-xs text-zinc-500">
              {lightboxIdx! + 1} / {photos.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Sub-components
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function EditModal({
  photo,
  onSave,
  onCancel,
}: {
  photo: DealPhoto;
  onSave: (photo: DealPhoto, caption: string, label: string) => void;
  onCancel: () => void;
}) {
  const [caption, setCaption] = useState(photo.caption || "");
  const [label, setLabel] = useState(photo.label || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800">
        <h4 className="mb-4 text-base font-semibold text-zinc-100">
          Edit Photo
        </h4>

        {/* Preview */}
        <img
          src={photo.signed_url || photo.image_url || ""}
          alt={photo.file_name}
          className="mb-4 h-40 w-full rounded-lg object-cover"
        />

        {/* Caption */}
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Caption
        </label>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption..."
          className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
        />

        {/* Label select */}
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Label
        </label>
        <select
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mb-5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
        >
          <option value="">None</option>
          {PHOTO_LABELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(photo, caption, label)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 shadow-2xl border border-zinc-800">
        <p className="mb-5 text-sm text-zinc-200">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Inline SVG Icons (no external deps needed)
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}


function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
