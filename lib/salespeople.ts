import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapDocToSalesperson } from "@/lib/salespeople-utils";
import type { Salesperson, SalespersonInput } from "@/lib/types";

const SALESPEOPLE_COLLECTION = "salespeople";

export { mapDocToSalesperson } from "@/lib/salespeople-utils";

export async function getActiveSalespeople(): Promise<Salesperson[]> {
  // Filtering `active` client-side (instead of a `where` clause) avoids needing a
  // composite Firestore index for the where+orderBy combination on this small collection.
  const snapshot = await getDocs(query(collection(db, SALESPEOPLE_COLLECTION), orderBy("name", "asc")));
  return snapshot.docs.map((docSnap) => mapDocToSalesperson(docSnap.id, docSnap.data())).filter((person) => person.active);
}

export function subscribeToSalespeople(
  onData: (salespeople: Salesperson[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const salespeopleQuery = query(collection(db, SALESPEOPLE_COLLECTION), orderBy("name", "asc"));
  return onSnapshot(
    salespeopleQuery,
    (snapshot) => onData(snapshot.docs.map((docSnap) => mapDocToSalesperson(docSnap.id, docSnap.data()))),
    onError
  );
}

export async function createSalesperson(input: SalespersonInput): Promise<string> {
  const ref = await addDoc(collection(db, SALESPEOPLE_COLLECTION), {
    ...input,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateSalesperson(id: string, input: SalespersonInput): Promise<void> {
  await updateDoc(doc(db, SALESPEOPLE_COLLECTION, id), { ...input });
}

export async function deleteSalesperson(id: string): Promise<void> {
  await deleteDoc(doc(db, SALESPEOPLE_COLLECTION, id));
}
