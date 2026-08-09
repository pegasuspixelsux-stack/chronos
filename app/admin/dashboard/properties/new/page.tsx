"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PropertyForm from "@/components/admin/PropertyForm";
import { createProperty, getAllProperties } from "@/lib/properties";
import { countSliderSlots } from "@/lib/property-utils";
import type { PropertyInput } from "@/lib/types";

export default function NewPropertyPage() {
  const router = useRouter();
  const [sliderCount, setSliderCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllProperties()
      .then((properties) => {
        if (cancelled) return;
        setSliderCount(countSliderSlots(properties));
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(values: PropertyInput) {
    await createProperty(values);
    router.push("/admin/dashboard/properties");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Add a property</h1>
      <div className="mt-6">
        {loaded ? (
          <PropertyForm submitLabel="Create property" onSubmit={handleSubmit} sliderCount={sliderCount} />
        ) : (
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading…</p>
        )}
      </div>
    </div>
  );
}
