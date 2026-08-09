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
  imageUrls: string[];
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

export type LeadStatus = "new" | "contacted" | "closed";

export interface Lead {
  id: string;
  propertyId: string;
  propertyTitle: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: LeadStatus;
  createdAt: number;
}

export type LeadInput = Omit<Lead, "id" | "createdAt">;

export interface SiteSettings {
  logoUrl: string;
  businessName: string;
  address: string;
  phone: string;
  whatsappNumber: string;
}

export interface AdminEntry {
  uid: string;
  addedBy: string;
  addedAt: number;
}
