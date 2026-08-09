import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from "firebase/storage";
import { app } from "@/lib/firebase";

const PROPERTY_IMAGES_PATH = "property-images";

// Same lazy-init pattern as lib/firebase.ts's getFirebaseAuth(): Storage is
// only ever needed from admin-only client components (image upload/delete),
// so it's kept local to this module rather than lib/firebase.ts — that way
// routes that only need Auth (e.g. /admin/login) never pull the Storage SDK
// into their bundle.
let cachedStorage: FirebaseStorage | null = null;

function getFirebaseStorage(): FirebaseStorage {
  if (!cachedStorage) {
    cachedStorage = getStorage(app);
  }
  return cachedStorage;
}

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
