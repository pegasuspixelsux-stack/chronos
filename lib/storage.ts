import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";

const PROPERTY_IMAGES_PATH = "property-images";

export async function uploadPropertyImage(file: File): Promise<string> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${PROPERTY_IMAGES_PATH}/${crypto.randomUUID()}-${sanitizedName}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteImages(urls: string[]): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      try {
        await deleteObject(ref(getFirebaseStorage(), url));
      } catch {
        // Best-effort: a missing/already-deleted file, or a transient
        // network error, should never block the caller — by the time this
        // runs, the Firestore write it's cleaning up after has already
        // succeeded.
      }
    })
  );
}
