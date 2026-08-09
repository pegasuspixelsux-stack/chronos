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
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { HERO_SLIDER_LIMIT, mapDocToProperty } from "@/lib/property-utils";
import type { Property, PropertyInput } from "@/lib/types";

const PROPERTIES_COLLECTION = "properties";

export {
  mapDocToProperty,
  formatPrice,
  matchesFilters,
  countSliderSlots,
  HERO_SLIDER_LIMIT,
  isAllowedImageFile,
  canAddImages,
  removedImageUrls,
  MAX_IMAGES_PER_PROPERTY,
} from "@/lib/property-utils";

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
  // Note: limit() here is a hard cap, not a "top 5 newest" guarantee — if
  // more than 5 docs somehow have inHeroSlider: true, Firestore returns an
  // arbitrary 5 and the client-side sort below only reorders that arbitrary
  // set, not the true 5 newest.
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
