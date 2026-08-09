export type PropertyType = "House" | "Apartment" | "Plot";

export const PROPERTY_TYPES: PropertyType[] = ["House", "Apartment", "Plot"];

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: PropertyType;
  location: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  imageUrl: string;
  featured: boolean;
  inHeroSlider: boolean;
  createdAt: number;
}

export type PropertyInput = Omit<Property, "id" | "createdAt">;

export interface PropertyFilters {
  propertyType?: PropertyType;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
}
