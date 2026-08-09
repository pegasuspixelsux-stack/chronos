import Link from "next/link";
import { notFound } from "next/navigation";
import InquiryForm from "@/components/InquiryForm";
import PropertyGallery from "@/components/PropertyGallery";
import { formatPrice, getPropertyById } from "@/lib/properties";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyById(id).catch(() => null);

  if (!property) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/properties" className="text-sm text-[var(--color-ink-secondary)] hover:underline">
        &larr; Back to catalog
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <PropertyGallery property={property} />

        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">{property.propertyType}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {property.title}
          </h1>
          <p className="mt-2 text-[var(--color-ink-secondary)]">{property.location}</p>
          <p className="mt-6 text-2xl font-medium text-[var(--color-ink)]">{formatPrice(property.price)}</p>

          <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-[var(--color-border)] py-6 text-center">
            <div>
              <dt className="text-xs uppercase text-[var(--color-ink-secondary)]">Bedrooms</dt>
              <dd className="mt-1 text-lg text-[var(--color-ink)]">{property.bedrooms}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--color-ink-secondary)]">Bathrooms</dt>
              <dd className="mt-1 text-lg text-[var(--color-ink)]">{property.bathrooms}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--color-ink-secondary)]">Area</dt>
              <dd className="mt-1 text-lg text-[var(--color-ink)]">{property.areaSqm} m²</dd>
            </div>
          </dl>

          <p className="mt-8 whitespace-pre-line text-[var(--color-ink-secondary)]">{property.description}</p>

          <InquiryForm propertyId={property.id} propertyTitle={property.title} />
        </div>
      </div>
    </div>
  );
}
