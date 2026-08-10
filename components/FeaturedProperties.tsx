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
    <section id="featured" className="mx-auto max-w-6xl px-[15px] py-24 sm:px-6">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
        Propiedades destacadas
      </h2>

      {loadError ? (
        <p className="mt-4 text-[var(--color-ink-secondary)]">
          Las propiedades no están disponibles en este momento. Volvé a intentarlo más tarde.
        </p>
      ) : properties.length === 0 ? (
        <p className="mt-4 text-[var(--color-ink-secondary)]">
          Todavía no hay propiedades destacadas. Volvé pronto, o explorá el catálogo completo.
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
