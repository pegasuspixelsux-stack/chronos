import { Timestamp, type DocumentData } from "firebase/firestore";
import type { Property, PropertyFilters } from "@/lib/types";

export const HERO_SLIDER_LIMIT = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PROPERTY = 10;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls
      : typeof data.imageUrl === "string" && data.imageUrl
        ? [data.imageUrl]
        : [],
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

export function isAllowedImageFile(file: File): boolean {
  return (ALLOWED_IMAGE_TYPES as string[]).includes(file.type) && file.size <= MAX_IMAGE_SIZE_BYTES;
}

export function canAddImages(current: string[], addingCount: number): boolean {
  return current.length + addingCount <= MAX_IMAGES_PER_PROPERTY;
}
