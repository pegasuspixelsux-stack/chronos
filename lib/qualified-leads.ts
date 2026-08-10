import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { QualifiedLeadInput } from "@/lib/types";

const QUALIFIED_LEADS_COLLECTION = "qualifiedLeads";

export async function createQualifiedLead(input: QualifiedLeadInput): Promise<string> {
  const ref = await addDoc(collection(db, QUALIFIED_LEADS_COLLECTION), {
    ...input,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}
