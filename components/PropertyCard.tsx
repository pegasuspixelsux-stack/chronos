import Link from "next/link";
import { formatPrice } from "@/lib/properties";
import type { Property, PropertyType } from "@/lib/types";

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  House: "Casa",
  Apartment: "Apartamento",
  Plot: "Terreno",
};

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block overflow-hidden rounded-xl bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-bone)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.imageUrls[0] || "https://picsum.photos/seed/chronos-property/800/800"}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {property.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-accent-teal)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Destacada
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">
          {PROPERTY_TYPE_LABELS[property.propertyType]}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{property.title}</h3>
        <p className="mt-1 text-sm text-[var(--color-ink-secondary)]">{property.location}</p>
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-ink-secondary)]">
          <span className="text-base font-bold text-[var(--color-ink)]">{formatPrice(property.price)}</span>
          <span>
            {property.bedrooms} dorm. &middot; {property.bathrooms} baños &middot; {property.areaSqm} m²
          </span>
        </div>
      </div>
    </Link>
  );
}
