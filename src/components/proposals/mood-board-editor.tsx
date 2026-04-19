"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Loader2, Upload, X } from "lucide-react";

export interface MoodBoardImage {
  id: string;
  url: string;
  caption?: string | null;
  position: number;
}

interface Props {
  proposalId: string;
  /** Prevents edits when true (e.g. proposal already sent). */
  readOnly?: boolean;
}

/**
 * Drag-and-drop-free uploader + grid for a proposal's mood board.
 *
 * Simple implementation choices:
 *   - No explicit drag-and-drop reorder yet. Order is insertion
 *     order; remove-and-re-upload to reshuffle. If users want drag
 *     reorder later we have `position` in the schema and a PATCH
 *     endpoint to hit.
 *   - Captions are edited inline (blur-to-save). Empty captions save
 *     as NULL.
 *   - Delete is optimistic with a rollback toast -- mood boards are
 *     low-stakes enough that the UX win outweighs the consistency risk.
 */
export function MoodBoardEditor({ proposalId, readOnly = false }: Props) {
  const [images, setImages] = useState<MoodBoardImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/proposals/${proposalId}/mood-board`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const serverMsg = body?.detail || body?.error;
        throw new Error(
          serverMsg
            ? `Failed to load mood board: ${serverMsg}`
            : "Failed to load mood board"
        );
      }
      setImages(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) {
        form.append("image", file);
      }
      const res = await fetch(`/api/proposals/${proposalId}/mood-board`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Upload failed");
      }
      if (Array.isArray(json.errors) && json.errors.length > 0) {
        const first = json.errors[0];
        toast.error(`${first.filename}: ${first.message}`);
      }
      if (Array.isArray(json.uploaded) && json.uploaded.length > 0) {
        setImages((prev) => [...prev, ...json.uploaded]);
        toast.success(
          `Added ${json.uploaded.length} image${json.uploaded.length === 1 ? "" : "s"}`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (imgId: string) => {
    // Optimistic: drop from state immediately, restore on failure.
    const backup = images;
    setImages((prev) => prev.filter((i) => i.id !== imgId));
    try {
      const res = await fetch(
        `/api/proposals/${proposalId}/mood-board/${imgId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      setImages(backup);
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleCaptionBlur = async (
    imgId: string,
    caption: string
  ) => {
    const existing = images.find((i) => i.id === imgId);
    if (!existing) return;
    // Only hit the server if something actually changed.
    const normalised = caption.trim();
    if ((existing.caption ?? "") === normalised) return;

    try {
      const res = await fetch(
        `/api/proposals/${proposalId}/mood-board/${imgId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caption: normalised || null }),
        }
      );
      if (!res.ok) throw new Error("Caption save failed");
      const updated = await res.json();
      setImages((prev) =>
        prev.map((i) => (i.id === imgId ? updated : i))
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <div>
      {!readOnly && (
        <div className="mb-4 flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            {uploading ? "Uploading..." : "Add images"}
          </button>
          <p className="text-xs text-gray-500">
            JPG / PNG / WebP up to 10 MB each, 20 per upload.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading mood board...
        </div>
      ) : images.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          {readOnly
            ? "No mood board attached to this proposal."
            : "No images yet. Use “Add images” above to upload inspiration for the bride."}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <figure
              key={img.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="relative aspect-square">
                <Image
                  src={img.url}
                  alt={img.caption ?? "Mood board image"}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized
                  className="object-cover"
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    className="absolute top-2 right-2 rounded-full bg-white/80 p-1 text-gray-700 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white"
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <figcaption className="p-2">
                {readOnly ? (
                  <p className="text-xs text-gray-600 min-h-[1.25rem]">
                    {img.caption ?? ""}
                  </p>
                ) : (
                  <input
                    type="text"
                    defaultValue={img.caption ?? ""}
                    placeholder="Add a caption..."
                    onBlur={(e) => handleCaptionBlur(img.id, e.target.value)}
                    className="w-full text-xs text-gray-700 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary-green rounded px-1"
                  />
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
