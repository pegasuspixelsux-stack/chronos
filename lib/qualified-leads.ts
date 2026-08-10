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
import { mapDocToQualifiedLead } from "@/lib/qualified-lead-utils";
import type { LeadStatus, QualifiedLead, QualifiedLeadInput } from "@/lib/types";

const QUALIFIED_LEADS_COLLECTION = "qualifiedLeads";

export { mapDocToQualifiedLead } from "@/lib/qualified-lead-utils";

export async function createQualifiedLead(input: QualifiedLeadInput): Promise<string> {
  const ref = await addDoc(collection(db, QUALIFIED_LEADS_COLLECTION), {
    ...input,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getAllQualifiedLeads(): Promise<QualifiedLead[]> {
  const snapshot = await getDocs(query(collection(db, QUALIFIED_LEADS_COLLECTION), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => mapDocToQualifiedLead(docSnap.id, docSnap.data()));
}

export function subscribeToQualifiedLeads(
  onData: (leads: QualifiedLead[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const leadsQuery = query(collection(db, QUALIFIED_LEADS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    leadsQuery,
    (snapshot) => onData(snapshot.docs.map((docSnap) => mapDocToQualifiedLead(docSnap.id, docSnap.data()))),
    onError
  );
}

export async function updateQualifiedLeadStatus(id: string, status: LeadStatus): Promise<void> {
  await updateDoc(doc(db, QUALIFIED_LEADS_COLLECTION, id), { status });
}
