import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Property, PropertyFilters, PropertyInput } from "@/lib/types";

const PROPERTIES_COLLECTION = "properties";
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

export async function getAllProperties(): Promise<Property[]> {
  const snapshot = await getDocs(
    query(collection(db, PROPERTIES_COLLECTION), orderBy("createdAt", "desc"))
  );
  return snapshot.docs.map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data()));
}

export async function getFeaturedProperties(): Promise<Property[]> {
  // Filter only (no orderBy) to avoid requiring a Firestore composite index;
  // sort client-side instead.
  const snapshot = await getDocs(
    query(collection(db, PROPERTIES_COLLECTION), where("featured", "==", true))
  );
  return snapshot.docs
    .map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getHeroSliderProperties(): Promise<Property[]> {
  // Filter + hard limit(5) at the query level (defense in depth beyond the
  // admin form's own max-5 validation); no orderBy, to avoid requiring a
  // Firestore composite index — sort client-side instead.
  const snapshot = await getDocs(
    query(
      collection(db, PROPERTIES_COLLECTION),
      where("inHeroSlider", "==", true),
      limit(HERO_SLIDER_LIMIT)
    )
  );
  return snapshot.docs
    .map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const snapshot = await getDoc(doc(db, PROPERTIES_COLLECTION, id));
  if (!snapshot.exists()) return null;
  return mapDocToProperty(snapshot.id, snapshot.data());
}

export async function createProperty(input: PropertyInput): Promise<string> {
  const ref = await addDoc(collection(db, PROPERTIES_COLLECTION), {
    ...input,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<void> {
  await updateDoc(doc(db, PROPERTIES_COLLECTION, id), { ...input });
}

export async function deleteProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, PROPERTIES_COLLECTION, id));
}

export function subscribeToProperties(
  onData: (properties: Property[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const propertiesQuery = query(collection(db, PROPERTIES_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    propertiesQuery,
    (snapshot) => onData(snapshot.docs.map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data()))),
    onError
  );
}
