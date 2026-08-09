"use client";

import { useRef, useState, type DragEvent } from "react";
import { canAddImages, isAllowedImageFile, MAX_IMAGES_PER_PROPERTY } from "@/lib/property-utils";
import { uploadPropertyImage } from "@/lib/storage";

export default function ImageGalleryUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setError(null);

    if (!canAddImages(value, files.length)) {
      setError(`You can add at most ${MAX_IMAGES_PER_PROPERTY} images per property.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const invalid = files.find((file) => !isAllowedImageFile(file));
    if (invalid) {
      setError(`"${invalid.name}" isn't a supported image (JPEG/PNG/WebP, up to 5MB).`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploadingCount(files.length);
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadPropertyImage(file)));
      onChange([...value, ...uploadedUrls]);
    } catch (err) {
      console.error("Image upload failed:", err);
      const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : undefined;
      setError(
        code === "storage/unauthorized"
          ? "You may not be authorized to upload images. Check that your account is in the admins allowlist."
          : "Could not upload one or more images. Check your connection and try again."
      );
    } finally {
      setUploadingCount(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex === null || fromIndex === index) return;
    const next = [...value];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(index, 0, moved);
    onChange(next);
  }

  return (
    <div className="sm:col-span-2">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Images ({value.length}/{MAX_IMAGES_PER_PROPERTY})
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFilesSelected(event.target.files)}
          disabled={uploadingCount > 0}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      {uploadingCount > 0 && (
        <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">
          Uploading {uploadingCount} image{uploadingCount > 1 ? "s" : ""}…
        </p>
      )}
      {error && <p className="mt-2 text-sm text-[var(--color-accent-red-text)]">{error}</p>}

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {value.map((url, index) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, index)}
              className="group relative aspect-square cursor-move overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bone)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" draggable={false} className="h-full w-full object-cover" />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-[var(--color-accent-teal)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label="Remove image"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
