import { Timestamp, type DocumentData } from "firebase/firestore";
import type { Property, PropertyFilters } from "@/lib/types";

export const HERO_SLIDER_LIMIT = 5;

export function mapDocToProperty(id: string, data: DocumentData): Property {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    title: data.title ?? "",
    description: data.description ?? "",
    price: data.price ?? 0,
    propertyType: data.propertyType ?? "House",
    location: data.location ?? "",
    bedrooms: data.bedrooms ?? 0,
    bathrooms: data.bathrooms ?? 0,
    areaSqm: data.areaSqm ?? 0,
    imageUrl: data.imageUrl ?? "",
    featured: data.featured ?? false,
    inHeroSlider: data.inHeroSlider ?? false,
    createdAt,
  };
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function matchesFilters(property: Property, filters: PropertyFilters): boolean {
  if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
  if (filters.location && !property.location.toLowerCase().includes(filters.location.toLowerCase())) {
    return false;
  }
  if (filters.minPrice !== undefined && property.price < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && property.price > filters.maxPrice) return false;
  if (filters.query) {
    const needle = filters.query.toLowerCase();
    const haystack = `${property.title} ${property.description} ${property.location}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export function countSliderSlots(properties: Property[], excludeId?: string): number {
  return properties.filter((property) => property.inHeroSlider && property.id !== excludeId).length;
}
