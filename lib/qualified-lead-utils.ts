import { Timestamp, type DocumentData } from "firebase/firestore";
import type {
  AcquisitionSource,
  BudgetRange,
  PreferredArea,
  PropertySizeRange,
  PropertyUsage,
  QualifiedLead,
  Timeframe,
} from "@/lib/types";

export function mapDocToQualifiedLead(id: string, data: DocumentData): QualifiedLead {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    acquisitionSource: (data.acquisitionSource ?? "Otro") as AcquisitionSource,
    timeframe: (data.timeframe ?? "Exploratorio / Sin prisa definida") as Timeframe,
    propertyUsage: (data.propertyUsage ?? "Otro") as PropertyUsage,
    preferredAreas: Array.isArray(data.preferredAreas) ? (data.preferredAreas as PreferredArea[]) : [],
    propertySize: (data.propertySize ?? "Hasta 150 m²") as PropertySizeRange,
    budgetRange: (data.budgetRange ?? "Menos de $500,000 USD") as BudgetRange,
    name: data.name ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    readinessScore: typeof data.readinessScore === "number" ? data.readinessScore : 0,
    leadTemperature: data.leadTemperature === "hot" ? "hot" : "warm",
    status: data.status ?? "new",
    createdAt,
  };
}
