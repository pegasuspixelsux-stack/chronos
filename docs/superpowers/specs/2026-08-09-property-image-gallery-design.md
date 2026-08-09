# Property Image Gallery — Design

## Goal

Replace the admin form's free-text "Image URL" field with a real image upload feature. Each property gets a gallery of up to 10 uploaded images instead of one hand-typed URL. First image in the gallery is the cover image, shown on cards, the hero slider, and anywhere else a single representative image is needed.

## 1. Data model

`Property.imageUrl: string` becomes `Property.imageUrls: string[]` (same rename on `PropertyInput`, in `lib/types.ts`). Cover image is always `imageUrls[0]`.

**Backward compatibility.** Firestore docs written before this feature have the old singular `imageUrl` field, not `imageUrls`. `mapDocToProperty` (`lib/property-utils.ts`) already defaults missing fields defensively at read time — it gains one more case: if a doc has no `imageUrls` array but does have a non-empty `imageUrl` string, wrap it as a one-item array. No migration script, no dual-write — every write from this point on only ever sets `imageUrls`.

```ts
imageUrls: Array.isArray(data.imageUrls)
  ? data.imageUrls
  : typeof data.imageUrl === "string" && data.imageUrl
    ? [data.imageUrl]
    : [],
```

## 2. Storage architecture

**Backend: Firebase Storage, direct client upload.** Already provisioned on this project (`storageBucket` is configured in `.env.local`, just unused by app code so far) — no new vendor, no new env vars, no server route.

New file `lib/storage.ts`, mirroring the existing `lib/properties.ts` pattern (thin wrappers around the Firebase SDK, one responsibility: Storage I/O):

- `uploadPropertyImage(file: File): Promise<string>` — uploads to `property-images/{crypto.randomUUID()}-{sanitizedFilename}`, returns the download URL via `getDownloadURL`
- `deleteImages(urls: string[]): Promise<void>` — best-effort deletion. Each URL is deleted via `deleteObject(ref(storage, url))` (the modular SDK's `ref()` accepts a full HTTPS download URL directly, no need to store a separate storage path alongside each URL); each individual failure is caught and ignored so one bad or already-gone file never blocks the rest

`lib/firebase.ts` gets `getFirebaseStorage()`, a lazily-memoized accessor — same pattern as the existing `getFirebaseAuth()` fix, so Storage initialization never happens at module-evaluation time and can't repeat the earlier build-crash bug class.

Pure constants/validators — `MAX_IMAGE_SIZE_BYTES`, `MAX_IMAGES_PER_PROPERTY`, `ALLOWED_IMAGE_TYPES`, `isAllowedImageFile(file: File): boolean`, `canAddImages(current: string[], addingCount: number): boolean` — go in the existing Firebase-free `lib/property-utils.ts`, not `lib/storage.ts`. This keeps them unit-testable and keeps the Storage SDK's weight out of any route/component that only needs the constants, not actual upload capability (the same bundle-composition lesson the Hero Slider plan's final review already established for this codebase).

**Security (`storage.rules`, new file).** Mirrors `firestore.rules`: public read, admin-only write, using the same `admins/{uid}` allowlist via Firebase Storage's Firestore cross-service rules support:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /property-images/{fileName} {
      allow read: if true;
      allow write: if isAdmin()
        && request.resource.size <= 5 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png|webp)');
      allow delete: if isAdmin();
    }
  }
}

function isAdmin() {
  return request.auth != null &&
    firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid));
}
```

Defense-in-depth: size and content-type are enforced at the rules level too, not just client-side — same pattern already used for the Hero Slider's max-5 limit (client-side guard + server-side enforcement). Per-property image count (max 10) is *not* enforceable at the rules level given the flat `property-images/` path (files aren't nested under a property ID), so that cap stays a client-side-only guard — an accepted, documented limitation, not an oversight.

`firebase.json` gains a `"storage"` key pointing at `storage.rules`, deployed via `firebase deploy --only storage` — same flow already used for `firestore.rules`.

## 3. Admin UI

New component `components/admin/ImageGalleryUpload.tsx`, replacing the "Image URL" text field inside `PropertyForm`. Props: `{ value: string[]; onChange: (urls: string[]) => void }`.

Responsibilities:
- File picker, `multiple`, `accept="image/jpeg,image/png,image/webp"`
- Client-side validation before any upload starts: rejects wrong file types and files over 5MB with an inline message (not a silent drop); rejects adding files that would push the total past 10
- Uploads each accepted file via `uploadPropertyImage`; shows a per-file spinner while its upload is in flight (no byte-level progress bar — not worth the complexity at a 5MB cap)
- Thumbnail grid with native HTML5 drag-and-drop reordering (`draggable`, `onDragStart`/`onDragOver`/`onDrop` — no new library, same approach already used for the Hero Slider carousel). First thumbnail is visually marked as the cover image
- Remove button per thumbnail — removes the URL from the in-memory array only (`onChange` with the filtered list); no Storage call happens here. Deletion from Storage is deferred to save time (see §4) so an admin can Cancel out of an edit without losing anything

## 4. Cleanup flow

**On edit save.** `app/admin/dashboard/properties/page.tsx`'s `handleUpdate` diffs `editingProperty.imageUrls` (the values the form was opened with) against the submitted `values.imageUrls` (what's being saved). Any URL present in the original but absent from the final list is passed to `deleteImages()` — but only *after* the Firestore `updateDoc` call succeeds, and as a best-effort cleanup that never fails or rolls back the save itself if it errors.

**On property delete.** `handleDelete` (same file) deletes the property's Firestore document first, exactly as today, then best-effort calls `deleteImages(property.imageUrls)` to clean up its Storage files. The Firestore delete stays authoritative — a Storage cleanup failure never blocks or reverts it.

`lib/properties.ts` (Firestore-only) and `lib/storage.ts` (Storage-only) each stay single-purpose; the page-level handlers in `app/admin/dashboard/properties/page.tsx` are what orchestrate across both — the same separation of concerns already established elsewhere in this codebase.

## 5. Consumer updates

- **`components/PropertyCard.tsx`:** cover thumbnail becomes `property.imageUrls[0]`, same picsum-placeholder fallback as today when the array is empty.
- **`components/HeroSlider.tsx`:** background image switches from `property.imageUrl` to `property.imageUrls[0]`, same fallback pattern.
- **`components/Hero.tsx`:** untouched — it's the generic search hero, doesn't render property images.
- **`app/properties/[id]/page.tsx`:** gains an actual gallery instead of a single static image. The page stays a Server Component (fetches via `getPropertyById`, unchanged); the new interactive part — click a thumbnail to swap the main displayed image — becomes a small new client component, `components/PropertyGallery.tsx`, taking `imageUrls: string[]` as a prop. Same "server fetches, client island renders/interacts" split already used for `Hero`/`HeroSlider`.

## 6. Testing plan

Following this codebase's established pattern — pure functions in `lib/` get Vitest coverage, UI components don't:

- `lib/property-utils.ts`: unit tests for `isAllowedImageFile()` (accepts jpeg/png/webp under 5MB; rejects wrong type; rejects oversized) and `canAddImages()` (allows up to the cap, rejects over)
- `mapDocToProperty`: new test case for the legacy `imageUrl` → `imageUrls` fallback, alongside its existing default-value test cases
- `lib/storage.ts`'s actual upload/delete calls are not unit-tested — they're thin Firebase SDK wrappers, same reasoning as why `lib/properties.ts`'s Firestore calls aren't unit-tested either. Verified via manual admin-flow smoke testing instead, same as every other Firestore/Storage write path in this app (no real Firebase project existed at plan-writing time for most of this codebase's history, but one now does — this feature can and should get a real manual smoke test against it as part of implementation sign-off).

## Non-goals (explicitly out of scope)

- Image editing/cropping/resizing in the browser before upload
- Server-side image optimization or thumbnail generation
- Enforcing the 10-image-per-property cap at the Storage rules level (accepted client-side-only limitation, see §2)
- Migrating existing single-`imageUrl` documents to the new field in Firestore itself (handled transparently at read time instead, see §1)
