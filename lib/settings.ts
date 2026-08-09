import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SiteSettings } from "@/lib/types";

const SETTINGS_COLLECTION = "settings";
const SITE_SETTINGS_DOC_ID = "site";

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const snapshot = await getDoc(doc(db, SETTINGS_COLLECTION, SITE_SETTINGS_DOC_ID));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    logoUrl: data.logoUrl ?? "",
    businessName: data.businessName ?? "",
    address: data.address ?? "",
    phone: data.phone ?? "",
    whatsappNumber: data.whatsappNumber ?? "",
  };
}

export async function updateSiteSettings(input: SiteSettings): Promise<void> {
  await setDoc(doc(db, SETTINGS_COLLECTION, SITE_SETTINGS_DOC_ID), input, { merge: true });
}
