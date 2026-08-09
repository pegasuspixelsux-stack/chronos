"use client";

import { useState } from "react";
import type { Property } from "@/lib/types";

export default function PropertyGallery({ property }: { property: Property }) {
  const images =
    property.imageUrls.length > 0
      ? property.imageUrls
      : [`https://picsum.photos/seed/chronos-property-detail-${property.id}/1200/900`];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bone)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[activeIndex]} alt={property.title} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === activeIndex}
              className={`aspect-square overflow-hidden rounded-md border transition-colors ${
                index === activeIndex ? "border-[var(--color-accent-teal)]" : "border-[var(--color-border)]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
