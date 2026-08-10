import { Timestamp, type DocumentData } from "firebase/firestore";
import type { AdvisorRequest } from "@/lib/types";

export function mapDocToAdvisorRequest(id: string, data: DocumentData): AdvisorRequest {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    propertyId: data.propertyId ?? "",
    propertyTitle: data.propertyTitle ?? "",
    name: data.name ?? "",
    whatsapp: data.whatsapp ?? "",
    salespersonName: data.salespersonName ?? "",
    status: data.status ?? "new",
    createdAt,
  };
}
