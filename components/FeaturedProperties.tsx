import PropertyCard from "@/components/PropertyCard";
import { getFeaturedProperties } from "@/lib/properties";
import type { Property } from "@/lib/types";

export default async function FeaturedProperties() {
  let properties: Property[] = [];
  let loadError = false;
  try {
    properties = await getFeaturedProperties();
  } catch {
    loadError = true;
  }

  return (
    <section id="featured" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">Featured listings</h2>

      {loadError ? (
        <p className="mt-4 text-[var(--color-ink-secondary)]">
          Listings are temporarily unavailable. Check the Firebase configuration in{" "}
          <code className="rounded bg-[var(--color-bone)] px-1.5 py-0.5 font-mono text-[0.9em]">.env.local</code>.
        </p>
      ) : properties.length === 0 ? (
        <p className="mt-4 text-[var(--color-ink-secondary)]">
          No featured properties yet. Check back soon, or browse the full catalog.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </section>
  );
}
