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
import { mapDocToAdvisorRequest } from "@/lib/advisor-request-utils";
import type { AdvisorRequest, AdvisorRequestInput, LeadStatus } from "@/lib/types";

const ADVISOR_REQUESTS_COLLECTION = "advisorRequests";

export { mapDocToAdvisorRequest } from "@/lib/advisor-request-utils";

export async function createAdvisorRequest(input: AdvisorRequestInput): Promise<string> {
  const ref = await addDoc(collection(db, ADVISOR_REQUESTS_COLLECTION), {
    ...input,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getAllAdvisorRequests(): Promise<AdvisorRequest[]> {
  const snapshot = await getDocs(query(collection(db, ADVISOR_REQUESTS_COLLECTION), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => mapDocToAdvisorRequest(docSnap.id, docSnap.data()));
}

export function subscribeToAdvisorRequests(
  onData: (requests: AdvisorRequest[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const requestsQuery = query(collection(db, ADVISOR_REQUESTS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    requestsQuery,
    (snapshot) => onData(snapshot.docs.map((docSnap) => mapDocToAdvisorRequest(docSnap.id, docSnap.data()))),
    onError
  );
}

export async function updateAdvisorRequestStatus(id: string, status: LeadStatus): Promise<void> {
  await updateDoc(doc(db, ADVISOR_REQUESTS_COLLECTION, id), { status });
}
