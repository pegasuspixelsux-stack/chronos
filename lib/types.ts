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
  addedAt: number | null;
}

export const ACQUISITION_SOURCES = [
  "Redes sociales",
  "Recomendación / Referido",
  "Búsqueda web / Google",
  "Publicidad digital",
  "Evento / Prensa",
  "Otro",
] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export const TIMEFRAMES = [
  "Inmediato (Menos de 1 mes)",
  "A corto plazo (1 a 3 meses)",
  "A mediano plazo (3 a 6 meses)",
  "Exploratorio / Sin prisa definida",
] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const PROPERTY_USAGES = [
  "Vivienda permanente (Todo el año)",
  "Residencia de descanso / Recreación",
  "Inversión para renta (Temporal/Anual)",
  "Otro",
] as const;
export type PropertyUsage = (typeof PROPERTY_USAGES)[number];

export const PREFERRED_AREAS = [
  "Playa Mansa",
  "Playa Brava",
  "La Barra",
  "Manantiales",
  "José Ignacio",
  "Beverly Hills / El Golf",
  "Otro",
] as const;
export type PreferredArea = (typeof PREFERRED_AREAS)[number];

export const PROPERTY_SIZE_RANGES = [
  "Hasta 150 m²",
  "150 m² a 300 m²",
  "300 m² a 500 m²",
  "Más de 500 m² / Gran superficie",
] as const;
export type PropertySizeRange = (typeof PROPERTY_SIZE_RANGES)[number];

export const BUDGET_RANGES = [
  "Menos de $500,000 USD",
  "$500,000 - $1,000,000 USD",
  "$1,000,000 - $2,500,000 USD",
  "Más de $2,500,000 USD",
] as const;
export type BudgetRange = (typeof BUDGET_RANGES)[number];

export type LeadTemperature = "hot" | "warm";

export interface QualifiedLead {
  id: string;
  acquisitionSource: AcquisitionSource;
  timeframe: Timeframe;
  propertyUsage: PropertyUsage;
  preferredAreas: PreferredArea[];
  propertySize: PropertySizeRange;
  budgetRange: BudgetRange;
  name: string;
  email: string;
  phone: string;
  readinessScore: number;
  leadTemperature: LeadTemperature;
  status: LeadStatus;
  createdAt: number;
}

export type QualifiedLeadInput = Omit<QualifiedLead, "id" | "createdAt">;
