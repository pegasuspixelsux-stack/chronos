import { Timestamp, type DocumentData } from "firebase/firestore";
import type { Salesperson } from "@/lib/types";

export function mapDocToSalesperson(id: string, data: DocumentData): Salesperson {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    name: data.name ?? "",
    active: data.active ?? true,
    createdAt,
  };
}
