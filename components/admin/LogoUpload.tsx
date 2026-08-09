"use client";

import { useRef, useState } from "react";
import { isAllowedImageFile } from "@/lib/property-utils";
import { uploadSiteLogo } from "@/lib/storage";

export default function LogoUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);

    if (!isAllowedImageFile(file)) {
      setError("Please choose a JPEG, PNG, or WebP image up to 5MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const url = await uploadSiteLogo(file);
      onChange(url);
    } catch (err) {
      console.error("Logo upload failed:", err);
      setError("Could not upload the logo. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Logo
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFileSelected(event.target.files)}
          disabled={uploading}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      {uploading && <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">Uploading…</p>}
      {error && <p className="mt-2 text-sm text-[var(--color-accent-red-text)]">{error}</p>}
      {value && !uploading && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Current logo"
          className="mt-3 h-16 w-16 rounded-md border border-[var(--color-border)] object-cover"
        />
      )}
    </div>
  );
}
