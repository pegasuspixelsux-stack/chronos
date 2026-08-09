import {
  addDoc,
  collection,
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
import { mapDocToLead } from "@/lib/lead-utils";
import type { Lead, LeadInput, LeadStatus } from "@/lib/types";

const LEADS_COLLECTION = "leads";

export { mapDocToLead, calculateResponseRate, countNewLeadsSince } from "@/lib/lead-utils";

export async function getAllLeads(): Promise<Lead[]> {
  const snapshot = await getDocs(query(collection(db, LEADS_COLLECTION), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => mapDocToLead(docSnap.id, docSnap.data()));
}

export async function createLead(input: LeadInput): Promise<string> {
  const ref = await addDoc(collection(db, LEADS_COLLECTION), {
    ...input,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export function subscribeToLeads(
  onData: (leads: Lead[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const leadsQuery = query(collection(db, LEADS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    leadsQuery,
    (snapshot) => onData(snapshot.docs.map((docSnap) => mapDocToLead(docSnap.id, docSnap.data()))),
    onError
  );
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  await updateDoc(doc(db, LEADS_COLLECTION, id), { status });
}
