import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AdminEntry } from "@/lib/types";

const ADMINS_COLLECTION = "admins";

function mapDocToAdmin(uid: string, data: DocumentData): AdminEntry {
  const addedAt = data.addedAt instanceof Timestamp ? data.addedAt.toMillis() : null;
  return { uid, addedBy: data.addedBy ?? "", addedAt };
}

export function subscribeToAdmins(
  onData: (admins: AdminEntry[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  // No orderBy here deliberately: Firestore's orderBy excludes documents
  // missing the ordered field entirely, and the very first admin (created
  // manually via the Firebase Console, before this feature existed) has no
  // addedAt field at all. Sort client-side so that account still appears.
  return onSnapshot(
    collection(db, ADMINS_COLLECTION),
    (snapshot) => {
      const admins = snapshot.docs.map((docSnap) => mapDocToAdmin(docSnap.id, docSnap.data()));
      onData(admins.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0)));
    },
    onError
  );
}

export async function addAdmin(uid: string, addedByUid: string): Promise<void> {
  await setDoc(doc(db, ADMINS_COLLECTION, uid), {
    addedBy: addedByUid,
    addedAt: serverTimestamp(),
  });
}

export async function removeAdmin(uid: string): Promise<void> {
  await deleteDoc(doc(db, ADMINS_COLLECTION, uid));
}
