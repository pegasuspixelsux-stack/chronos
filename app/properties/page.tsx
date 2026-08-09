import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import { getAllProperties, matchesFilters } from "@/lib/properties";
import { PROPERTY_TYPES, type Property, type PropertyType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const searchQuery = typeof params.query === "string" ? params.query : undefined;
  const propertyType =
    typeof params.propertyType === "string" ? (params.propertyType as PropertyType) : undefined;
  const location = typeof params.location === "string" ? params.location : undefined;

  let properties: Property[] = [];
  let loadError = false;
  try {
    properties = await getAllProperties();
  } catch {
    loadError = true;
  }

  const filtered = properties.filter((property) =>
    matchesFilters(property, { query: searchQuery, propertyType, location })
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">Property catalog</h1>
        <p className="mt-3 text-[var(--color-ink-secondary)]">
          {filtered.length} {filtered.length === 1 ? "listing" : "listings"}
          {location ? ` in ${location}` : ""}
          {propertyType ? ` · ${propertyType}` : ""}
        </p>
      </div>

      <form className="mt-8 flex flex-wrap gap-3 border-b border-[var(--color-border)] pb-8" method="get">
        <input
          type="text"
          name="query"
          defaultValue={searchQuery ?? ""}
          placeholder="Search by keyword"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
        />
        <select
          name="propertyType"
          defaultValue={propertyType ?? ""}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
        >
          <option value="">Any type</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="location"
          defaultValue={location ?? ""}
          placeholder="Location"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Filter
        </button>
        {(searchQuery || propertyType || location) && (
          <Link
            href="/properties"
            className="flex items-center px-3 text-sm text-[var(--color-ink-secondary)] underline-offset-2 hover:underline"
          >
            Clear filters
          </Link>
        )}
      </form>

      {loadError ? (
        <p className="mt-12 text-[var(--color-ink-secondary)]">
          Listings are temporarily unavailable. Check the Firebase configuration in{" "}
          <code className="rounded bg-[var(--color-bone)] px-1.5 py-0.5 font-mono text-[0.9em]">.env.local</code>.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-[var(--color-ink-secondary)]">No properties match those filters yet.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
