"use client";

import { useRouter } from "next/navigation";
import PropertyForm from "@/components/admin/PropertyForm";
import { createProperty } from "@/lib/properties";
import type { PropertyInput } from "@/lib/types";

export default function NewPropertyPage() {
  const router = useRouter();

  async function handleSubmit(values: PropertyInput) {
    await createProperty(values);
    router.push("/admin/dashboard/properties");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Add a property</h1>
      <div className="mt-6">
        <PropertyForm submitLabel="Create property" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
