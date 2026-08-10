"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/property-utils";
import type { Property } from "@/lib/types";

const AUTO_ROTATE_MS = 5000;

export default function HeroSlider({ properties }: { properties: Property[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (properties.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % properties.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(interval);
  }, [properties.length]);

  if (properties.length === 0) {
    return null;
  }

  return (
    <section className="relative h-[85vh] min-h-[480px] w-full overflow-hidden md:h-[90vh]">
      {properties.map((property, index) => (
        <div
          key={property.id}
          aria-hidden={index !== currentIndex}
          inert={index !== currentIndex ? true : undefined}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
            index === currentIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{
            backgroundImage: `linear-gradient(to top right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, transparent 80%), url(${
              property.imageUrls[0] || `https://picsum.photos/seed/chronos-slide-${property.id}/1920/1080`
            })`,
          }}
        >
          <div className="absolute bottom-8 left-[15px] max-w-xl sm:left-8">
            <h2 className="text-3xl font-bold text-white md:text-4xl">{property.title}</h2>
            <p className="mt-2 text-lg text-gray-200">
              {property.location} &middot; {formatPrice(property.price)}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              {property.bedrooms} dorm. &middot; {property.bathrooms} baños &middot; {property.areaSqm} m²
            </p>
            <Link
              href={`/properties/${property.id}`}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
            >
              Consulte un asesor
            </Link>
          </div>
        </div>
      ))}

      {properties.length > 1 && (
        <div className="absolute right-[15px] bottom-4 flex gap-2 sm:right-8">
          {properties.map((property, index) => (
            <button
              key={property.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`Ir a la diapositiva ${index + 1}`}
              aria-current={index === currentIndex}
              className={`h-1.5 w-10 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
