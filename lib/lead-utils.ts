import { Timestamp, type DocumentData } from "firebase/firestore";
import type { Lead } from "@/lib/types";

export function mapDocToLead(id: string, data: DocumentData): Lead {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    propertyId: data.propertyId ?? "",
    propertyTitle: data.propertyTitle ?? "",
    name: data.name ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    message: data.message ?? "",
    status: data.status ?? "new",
    createdAt,
  };
}

export function calculateResponseRate(leads: Lead[]): number {
  if (leads.length === 0) return 0;
  const responded = leads.filter((lead) => lead.status !== "new").length;
  return Math.round((responded / leads.length) * 100);
}

export function countNewLeadsSince(leads: Lead[], sinceMillis: number): number {
  return leads.filter((lead) => lead.createdAt >= sinceMillis).length;
}
