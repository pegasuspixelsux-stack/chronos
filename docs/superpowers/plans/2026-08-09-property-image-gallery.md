# Property Image Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin form's free-text "Image URL" field with real image uploads. Each property gets a gallery of up to 10 uploaded images (Firebase Storage) instead of one hand-typed URL. The first image is the cover image everywhere a single representative image is needed (cards, hero slider).

**Architecture:** Firebase Storage (client SDK, direct browser upload — already provisioned on this project, no new vendor). `Property.imageUrl: string` becomes `Property.imageUrls: string[]`; legacy single-`imageUrl` documents are handled transparently at read time in `mapDocToProperty`, no migration script. A new `lib/storage.ts` mirrors the existing `lib/properties.ts` pattern (thin Firestore-free... Storage-focused wrappers); pure validators live in the already-Firebase-free `lib/property-utils.ts`. A new `components/admin/ImageGalleryUpload.tsx` replaces the URL text field inside `PropertyForm`: multi-file upload, native-HTML5 drag-to-reorder, remove-from-array-only (Storage deletion is deferred to save time, never on click). `storage.rules` mirrors `firestore.rules` exactly — public read, admin-only write via the same `admins/{uid}` allowlist.

**Tech Stack:** Same as the existing app — Next.js App Router, TypeScript, Tailwind CSS v4, Firebase JS SDK (Firestore + Auth + **Storage**, all already installed in the `firebase` package — no new dependency), Vitest.

**Design doc:** `docs/superpowers/specs/2026-08-09-property-image-gallery-design.md`

## Global Constraints

- `Property.imageUrl: string` → `Property.imageUrls: string[]` (same on `PropertyInput`), in `lib/types.ts`. Cover image is always `imageUrls[0]`.
- Backward compatibility is read-time only, in `mapDocToProperty`: a doc with no `imageUrls` array but a non-empty legacy `imageUrl` string gets wrapped as a one-item array. No Firestore migration script; every write from this plan onward only ever sets `imageUrls`.
- No new npm dependency. `firebase/storage` ships in the already-installed `firebase` package (`^12.17.1`). Drag-to-reorder uses native HTML5 drag events, no library — same "no new dependency" pattern already used for the Hero Slider carousel.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is already configured in `lib/firebase.ts`'s `firebaseConfig` object (has been since the very first Firebase setup task) — nothing to add there.
- `lib/firebase.ts` gets `getFirebaseStorage()`, a lazily-memoized accessor — same pattern as the existing `getFirebaseAuth()` (never initialize a Firebase service at module-evaluation time; that class of bug already crashed one production build in this project).
- Pure constants/validators (`MAX_IMAGE_SIZE_BYTES`, `MAX_IMAGES_PER_PROPERTY`, `ALLOWED_IMAGE_TYPES`, `isAllowedImageFile`, `canAddImages`) live in `lib/property-utils.ts` (Firebase-free, already the established home for pure property-domain logic) — never in `lib/storage.ts`, which is Storage-SDK-dependent and must stay out of any bundle that doesn't actually upload.
- File limits: JPEG/PNG/WebP only, 5MB per file, max 10 images per property. Enforced client-side (immediate feedback) AND at the `storage.rules` level for size/content-type (defense in depth, same pattern as the Hero Slider's client+server max-5 enforcement). The 10-per-property count is **not** enforceable at the rules level (flat `property-images/` path, not nested per-property) — accepted, documented limitation, not an oversight.
- Image removal in the admin form removes the URL from the in-memory array only — never deletes from Storage on click. Storage cleanup happens only after a successful save: diff the original `imageUrls` against the submitted ones, best-effort delete whatever was dropped. Same best-effort semantics on whole-property delete (delete the Firestore doc first, authoritative; clean up its images after, non-blocking).
- `storage.rules` mirrors `firestore.rules`: public read, write/delete gated behind the same `admins/{uid}` allowlist via Firebase Storage's Firestore cross-service rules support (`firestore.exists(...)`).
- Path alias `@/*`, no `edge` runtime, `export const dynamic = "force-dynamic"` on Firestore-reading routes — all unchanged, apply here too where relevant.
- A real Firebase project now exists and is live (`chronos-a33e7`) — unlike earlier plans in this repo's history, this plan's final smoke-test task should include an actual manual test against real Storage, not just "explorable without a real project" fallback verification.

---

### Task 1: Data model, pure validators, and legacy-compat tests

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/property-utils.ts`
- Modify: `lib/properties.test.ts`

**Interfaces:**
- Produces: `Property.imageUrls: string[]`, `PropertyInput.imageUrls: string[]` (`@/lib/types`); `MAX_IMAGE_SIZE_BYTES`, `MAX_IMAGES_PER_PROPERTY`, `ALLOWED_IMAGE_TYPES`, `isAllowedImageFile(file: File): boolean`, `canAddImages(current: string[], addingCount: number): boolean` (`@/lib/property-utils`) — consumed by Tasks 3 and 4. Updated `mapDocToProperty` — consumed by every existing caller unchanged (same signature).

- [ ] **Step 1: Rename `imageUrl` to `imageUrls` in `lib/types.ts`**

```ts
export type PropertyType = "House" | "Apartment" | "Plot";

export const PROPERTY_TYPES: PropertyType[] = ["House", "Apartment", "Plot"];

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  propertyType: PropertyType;
  location: string;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  imageUrls: string[];
  featured: boolean;
  inHeroSlider: boolean;
  createdAt: number;
}

export type PropertyInput = Omit<Property, "id" | "createdAt">;

export interface PropertyFilters {
  propertyType?: PropertyType;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  query?: string;
}
```

- [ ] **Step 2: Write the failing tests in `lib/properties.test.ts`**

Replace the file in full — updates every existing `imageUrl: "..."` object literal to `imageUrls: [...]` (required for the file to compile against the new type), adds a legacy-compat test case for `mapDocToProperty`, and adds new `describe` blocks for `isAllowedImageFile` and `canAddImages`:

```ts
import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  canAddImages,
  countSliderSlots,
  formatPrice,
  isAllowedImageFile,
  mapDocToProperty,
  matchesFilters,
} from "@/lib/property-utils";
import type { Property } from "@/lib/types";

describe("mapDocToProperty", () => {
  it("maps a Firestore document into a Property, converting the timestamp to millis", () => {
    const createdAt = Timestamp.fromMillis(1700000000000);
    const property = mapDocToProperty("abc123", {
      title: "Hillside Cottage",
      description: "A quiet retreat.",
      price: 250000,
      propertyType: "House",
      location: "Asheville, NC",
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 140,
      imageUrls: ["https://example.com/house.jpg", "https://example.com/house-2.jpg"],
      featured: true,
      inHeroSlider: true,
      createdAt,
    });

    expect(property).toEqual({
      id: "abc123",
      title: "Hillside Cottage",
      description: "A quiet retreat.",
      price: 250000,
      propertyType: "House",
      location: "Asheville, NC",
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 140,
      imageUrls: ["https://example.com/house.jpg", "https://example.com/house-2.jpg"],
      featured: true,
      inHeroSlider: true,
      createdAt: 1700000000000,
    });
  });

  it("wraps a legacy single imageUrl string into imageUrls for pre-gallery documents", () => {
    const property = mapDocToProperty("legacy1", {
      title: "Old Listing",
      imageUrl: "https://example.com/old-house.jpg",
    });
    expect(property.imageUrls).toEqual(["https://example.com/old-house.jpg"]);
  });

  it("fills in safe defaults for missing fields", () => {
    const property = mapDocToProperty("xyz", {});
    expect(property.title).toBe("");
    expect(property.price).toBe(0);
    expect(property.propertyType).toBe("House");
    expect(property.featured).toBe(false);
    expect(property.inHeroSlider).toBe(false);
    expect(property.imageUrls).toEqual([]);
  });
});

describe("formatPrice", () => {
  it("formats a number as whole-dollar USD currency", () => {
    expect(formatPrice(250000)).toBe("$250,000");
  });
});

describe("matchesFilters", () => {
  const base: Property = {
    id: "1",
    title: "Hillside Cottage",
    description: "A quiet retreat near the trailhead.",
    price: 250000,
    propertyType: "House",
    location: "Asheville, NC",
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 140,
    imageUrls: [],
    featured: true,
    inHeroSlider: false,
    createdAt: 0,
  };

  it("passes when no filters are set", () => {
    expect(matchesFilters(base, {})).toBe(true);
  });

  it("filters out a mismatched property type", () => {
    expect(matchesFilters(base, { propertyType: "Apartment" })).toBe(false);
  });

  it("filters by case-insensitive location substring", () => {
    expect(matchesFilters(base, { location: "asheville" })).toBe(true);
    expect(matchesFilters(base, { location: "Denver" })).toBe(false);
  });

  it("filters by price range", () => {
    expect(matchesFilters(base, { minPrice: 300000 })).toBe(false);
    expect(matchesFilters(base, { maxPrice: 200000 })).toBe(false);
    expect(matchesFilters(base, { minPrice: 100000, maxPrice: 300000 })).toBe(true);
  });

  it("filters by free-text query across title, description, and location", () => {
    expect(matchesFilters(base, { query: "trailhead" })).toBe(true);
    expect(matchesFilters(base, { query: "swimming pool" })).toBe(false);
  });
});

describe("countSliderSlots", () => {
  function makeProperty(overrides: Partial<Property>): Property {
    return {
      id: "id",
      title: "Property",
      description: "",
      price: 100000,
      propertyType: "House",
      location: "Somewhere",
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: 50,
      imageUrls: [],
      featured: false,
      inHeroSlider: false,
      createdAt: 0,
      ...overrides,
    };
  }

  it("counts properties currently in the hero slider", () => {
    const properties = [
      makeProperty({ id: "1", inHeroSlider: true }),
      makeProperty({ id: "2", inHeroSlider: false }),
      makeProperty({ id: "3", inHeroSlider: true }),
    ];
    expect(countSliderSlots(properties)).toBe(2);
  });

  it("excludes the property being edited from the count", () => {
    const properties = [
      makeProperty({ id: "1", inHeroSlider: true }),
      makeProperty({ id: "2", inHeroSlider: true }),
    ];
    expect(countSliderSlots(properties, "1")).toBe(1);
  });

  it("returns 0 when no properties are in the slider", () => {
    const properties = [makeProperty({ id: "1", inHeroSlider: false })];
    expect(countSliderSlots(properties)).toBe(0);
  });
});

describe("isAllowedImageFile", () => {
  it("accepts a JPEG under the size limit", () => {
    const file = new File([new Uint8Array(1024)], "photo.jpg", { type: "image/jpeg" });
    expect(isAllowedImageFile(file)).toBe(true);
  });

  it("accepts PNG and WebP", () => {
    expect(isAllowedImageFile(new File([], "a.png", { type: "image/png" }))).toBe(true);
    expect(isAllowedImageFile(new File([], "a.webp", { type: "image/webp" }))).toBe(true);
  });

  it("rejects an unsupported file type", () => {
    const file = new File([new Uint8Array(1024)], "doc.pdf", { type: "application/pdf" });
    expect(isAllowedImageFile(file)).toBe(false);
  });

  it("rejects a file over 5MB", () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "huge.jpg", { type: "image/jpeg" });
    expect(isAllowedImageFile(file)).toBe(false);
  });
});

describe("canAddImages", () => {
  it("allows adding up to the 10-image cap", () => {
    expect(canAddImages(new Array(8).fill(""), 2)).toBe(true);
  });

  it("rejects adding past the 10-image cap", () => {
    expect(canAddImages(new Array(8).fill(""), 3)).toBe(false);
  });

  it("allows adding to an empty gallery", () => {
    expect(canAddImages([], 5)).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests and confirm the new ones fail**

Run: `npx vitest run lib/properties.test.ts`
Expected: FAIL — `isAllowedImageFile` and `canAddImages` aren't exported from `lib/property-utils.ts` yet; the legacy-`imageUrl` and `imageUrls`-default assertions fail since `mapDocToProperty` doesn't produce that field yet; every other test also fails to compile until `lib/types.ts`'s `Property.imageUrls` exists (already done in Step 1) — expect a mix of type errors and assertion failures until Step 4 lands.

- [ ] **Step 4: Implement the changes in `lib/property-utils.ts`**

Replace the file in full:

```ts
import { Timestamp, type DocumentData } from "firebase/firestore";
import type { Property, PropertyFilters } from "@/lib/types";

export const HERO_SLIDER_LIMIT = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES_PER_PROPERTY = 10;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function mapDocToProperty(id: string, data: DocumentData): Property {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    id,
    title: data.title ?? "",
    description: data.description ?? "",
    price: data.price ?? 0,
    propertyType: data.propertyType ?? "House",
    location: data.location ?? "",
    bedrooms: data.bedrooms ?? 0,
    bathrooms: data.bathrooms ?? 0,
    areaSqm: data.areaSqm ?? 0,
    imageUrls: Array.isArray(data.imageUrls)
      ? data.imageUrls
      : typeof data.imageUrl === "string" && data.imageUrl
        ? [data.imageUrl]
        : [],
    featured: data.featured ?? false,
    inHeroSlider: data.inHeroSlider ?? false,
    createdAt,
  };
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function matchesFilters(property: Property, filters: PropertyFilters): boolean {
  if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
  if (filters.location && !property.location.toLowerCase().includes(filters.location.toLowerCase())) {
    return false;
  }
  if (filters.minPrice !== undefined && property.price < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && property.price > filters.maxPrice) return false;
  if (filters.query) {
    const needle = filters.query.toLowerCase();
    const haystack = `${property.title} ${property.description} ${property.location}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export function countSliderSlots(properties: Property[], excludeId?: string): number {
  return properties.filter((property) => property.inHeroSlider && property.id !== excludeId).length;
}

export function isAllowedImageFile(file: File): boolean {
  return (ALLOWED_IMAGE_TYPES as string[]).includes(file.type) && file.size <= MAX_IMAGE_SIZE_BYTES;
}

export function canAddImages(current: string[], addingCount: number): boolean {
  return current.length + addingCount <= MAX_IMAGES_PER_PROPERTY;
}
```

- [ ] **Step 5: Update the re-export list in `lib/properties.ts`**

`lib/properties.ts` re-exports pure functions from `lib/property-utils.ts` for backward-compatible imports. Update the re-export line to include the two new functions and constants:

```ts
export {
  mapDocToProperty,
  formatPrice,
  matchesFilters,
  countSliderSlots,
  HERO_SLIDER_LIMIT,
  isAllowedImageFile,
  canAddImages,
  MAX_IMAGES_PER_PROPERTY,
} from "@/lib/property-utils";
```

This is the only change to `lib/properties.ts` in this task — everything else in the file (the Firestore CRUD functions) is untouched.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `npx vitest run lib/properties.test.ts`
Expected: PASS — all tests green (11 existing + 1 legacy-compat + 6 new validator tests = 18).

- [ ] **Step 7: Verify types**

Run: `npx tsc --noEmit`
Expected: errors in every file that still references `Property.imageUrl` or constructs a `PropertyInput`/`Property` literal with `imageUrl:` — this is expected at this point in the plan; Tasks 3–5 fix each remaining call site. Confirm the errors are *only* in `components/admin/PropertyForm.tsx`, `app/admin/dashboard/properties/page.tsx`, `components/PropertyCard.tsx`, `components/HeroSlider.tsx`, and `app/properties/[id]/page.tsx` — if errors appear anywhere else, stop and investigate before continuing.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/property-utils.ts lib/properties.ts lib/properties.test.ts
git commit -m "feat: add imageUrls gallery field with legacy imageUrl compat and image validators"
```

The repo is intentionally mid-migration after this commit (`tsc` fails elsewhere) — that's expected; Tasks 2–5 are not yet done. Do not attempt to make `tsc` pass at this checkpoint by touching files outside this task's scope.

---

### Task 2: Firebase Storage layer and security rules

**Files:**
- Modify: `lib/firebase.ts`
- Create: `lib/storage.ts`
- Create: `storage.rules`
- Modify: `firebase.json`

**Interfaces:**
- Produces: `getFirebaseStorage(): FirebaseStorage` (`@/lib/firebase`); `uploadPropertyImage(file: File): Promise<string>`, `deleteImages(urls: string[]): Promise<void>` (`@/lib/storage`) — consumed by Tasks 3 and 4.

- [ ] **Step 1: Add `getFirebaseStorage()` to `lib/firebase.ts`**

Replace the file in full:

```ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);

// getAuth() validates the API key's format synchronously and throws if it's
// missing/invalid — unlike getFirestore(), which doesn't. Initializing it
// eagerly at module scope crashes Next's build-time "collect page data" step
// (which imports every route's module graph, including this file via `db`,
// regardless of `force-dynamic`) whenever Firebase env vars aren't
// configured — e.g. a fresh deploy target before real values exist there
// (`.env.local` is gitignored and never ships to a deployment). Deferring
// the call until something actually needs Auth (a client-side event handler
// or effect — never module-evaluation time) avoids that crash entirely.
let cachedAuth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

// Same lazy-init pattern as getFirebaseAuth() above, applied consistently:
// Storage is only ever needed from admin-only client components (image
// upload/delete), so there's no reason to pay its init cost — or risk
// repeating the same class of build-time bug — on every route.
let cachedStorage: FirebaseStorage | null = null;

export function getFirebaseStorage(): FirebaseStorage {
  if (!cachedStorage) {
    cachedStorage = getStorage(app);
  }
  return cachedStorage;
}

export { app, db };
```

- [ ] **Step 2: Create `lib/storage.ts`**

```ts
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
```

`ref()` from the modular Storage SDK accepts a full HTTPS download URL directly (not just a `gs://` path or a relative path string) — no need to store a separate Storage path alongside each URL in Firestore; the download URL alone is enough to construct a deletable reference.

- [ ] **Step 3: Create `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAdmin() {
      return request.auth != null &&
        firestore.exists(/databases/(default)/documents/admins/$(request.auth.uid));
    }

    match /property-images/{fileName} {
      allow read: if true;
      allow write: if isAdmin()
        && request.resource.size <= 5 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png|webp)');
      allow delete: if isAdmin();
    }
  }
}
```

Public read (properties are publicly visible); write/delete gated behind the same `admins/{uid}` allowlist doc that `firestore.rules` already uses (via Storage's Firestore cross-service rules support, `firestore.exists(...)`). `isAdmin()` is declared inside `match /b/{bucket}/o { ... }` so it's visible to the nested `match` block — same nesting convention `firestore.rules` uses for its own `isAdmin()`.

- [ ] **Step 4: Point `firebase.json` at the new rules file**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

- [ ] **Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: the same pre-existing errors from Task 1 Step 7 (unrelated files not yet migrated), plus no *new* errors introduced by this task's files. If `lib/firebase.ts` or `lib/storage.ts` themselves show errors, stop and fix before continuing.

- [ ] **Step 6: Deploy the Storage rules to the live project**

A real Firebase project exists for this app (`chronos-a33e7`, already linked via `.firebaserc`). Deploy now rather than waiting until the final task, so a rules syntax error surfaces immediately instead of at the end of the plan:

```bash
firebase deploy --only storage
```

Expected: `Deploy complete!`. If it fails with a rules-compilation error, fix `storage.rules` and redeploy before moving on — do not proceed to Task 3 with unverified rules syntax.

- [ ] **Step 7: Commit**

```bash
git add lib/firebase.ts lib/storage.ts storage.rules firebase.json
git commit -m "feat: add Firebase Storage layer and security rules for property images"
```

---

### Task 3: ImageGalleryUpload component

**Files:**
- Create: `components/admin/ImageGalleryUpload.tsx`

**Interfaces:**
- Consumes: `uploadPropertyImage` (`@/lib/storage`, Task 2); `canAddImages`, `isAllowedImageFile`, `MAX_IMAGES_PER_PROPERTY` (`@/lib/property-utils`, Task 1).
- Produces: default export `ImageGalleryUpload` from `@/components/admin/ImageGalleryUpload`, props `{ value: string[]; onChange: (urls: string[]) => void }`, consumed by Task 4.

- [ ] **Step 1: Create `components/admin/ImageGalleryUpload.tsx`**

```tsx
"use client";

import { useRef, useState, type DragEvent } from "react";
import { canAddImages, isAllowedImageFile, MAX_IMAGES_PER_PROPERTY } from "@/lib/property-utils";
import { uploadPropertyImage } from "@/lib/storage";

export default function ImageGalleryUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setError(null);

    if (!canAddImages(value, files.length)) {
      setError(`You can add at most ${MAX_IMAGES_PER_PROPERTY} images per property.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const invalid = files.find((file) => !isAllowedImageFile(file));
    if (invalid) {
      setError(`"${invalid.name}" isn't a supported image (JPEG/PNG/WebP, up to 5MB).`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploadingCount(files.length);
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadPropertyImage(file)));
      onChange([...value, ...uploadedUrls]);
    } catch {
      setError("Could not upload one or more images. Check your connection and try again.");
    } finally {
      setUploadingCount(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleDrop(index: number) {
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex === null || fromIndex === index) return;
    const next = [...value];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(index, 0, moved);
    onChange(next);
  }

  return (
    <div className="sm:col-span-2">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Images ({value.length}/{MAX_IMAGES_PER_PROPERTY})
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFilesSelected(event.target.files)}
          disabled={uploadingCount > 0}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      {uploadingCount > 0 && (
        <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">
          Uploading {uploadingCount} image{uploadingCount > 1 ? "s" : ""}…
        </p>
      )}
      {error && <p className="mt-2 text-sm text-[var(--color-accent-red-text)]">{error}</p>}

      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {value.map((url, index) => (
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              className="group relative aspect-square cursor-move overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-bone)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded bg-[var(--color-accent-teal)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label="Remove image"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Design notes for implementers/reviewers:
- Removal here only calls `onChange` with a filtered array — no `deleteImages` call. Storage cleanup is deferred to save time, handled entirely in Task 4's page-level `handleUpdate`/`handleDelete`, per the plan's global constraints. Don't "fix" this by adding an eager delete.
- Dragging an in-flight-uploading item isn't specifically guarded against, because it can't happen: new uploads are only appended to `value` once `Promise.all` resolves, so no new thumbnail exists to drag until the upload finishes. Existing thumbnails' indices don't shift during an upload.
- `key={url}` on each thumbnail is safe because `uploadPropertyImage` generates a UUID-based path per file — URLs won't collide even if the same file is uploaded twice.

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: same pre-existing errors from prior tasks (files not yet migrated) plus no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add components/admin/ImageGalleryUpload.tsx
git commit -m "feat: add ImageGalleryUpload component"
```

---

### Task 4: Wire the gallery into PropertyForm and both admin pages

**Files:**
- Modify: `components/admin/PropertyForm.tsx`
- Modify: `app/admin/dashboard/properties/page.tsx`
- Modify: `app/admin/dashboard/properties/new/page.tsx`

**Interfaces:**
- Consumes: `ImageGalleryUpload` (`@/components/admin/ImageGalleryUpload`, Task 3); `deleteImages` (`@/lib/storage`, Task 2).

- [ ] **Step 1: Replace the "Image URL" field in `components/admin/PropertyForm.tsx`**

Replace the file in full:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import ImageGalleryUpload from "@/components/admin/ImageGalleryUpload";
import { HERO_SLIDER_LIMIT } from "@/lib/property-utils";
import { PROPERTY_TYPES, type PropertyInput, type PropertyType } from "@/lib/types";

const EMPTY_FORM: PropertyInput = {
  title: "",
  description: "",
  price: 0,
  propertyType: "House",
  location: "",
  bedrooms: 0,
  bathrooms: 0,
  areaSqm: 0,
  imageUrls: [],
  featured: false,
  inHeroSlider: false,
};

export default function PropertyForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  sliderCount,
}: {
  initialValues?: PropertyInput;
  submitLabel: string;
  onSubmit: (values: PropertyInput) => Promise<void>;
  onCancel?: () => void;
  sliderCount: number;
}) {
  const [values, setValues] = useState<PropertyInput>(initialValues ?? EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSliderToggle(checked: boolean) {
    if (checked && sliderCount >= HERO_SLIDER_LIMIT) {
      window.alert("Maximum of 5 properties can be featured in the hero slider.");
      return;
    }
    update("inHeroSlider", checked);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save this property. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Title
        <input
          required
          value={values.title}
          onChange={(event) => update("title", event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Description
        <textarea
          rows={4}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Price (USD)
        <input
          type="number"
          required
          min={0}
          value={values.price}
          onChange={(event) => update("price", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Property type
        <select
          value={values.propertyType}
          onChange={(event) => update("propertyType", event.target.value as PropertyType)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Location
        <input
          required
          value={values.location}
          onChange={(event) => update("location", event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Bedrooms
        <input
          type="number"
          min={0}
          value={values.bedrooms}
          onChange={(event) => update("bedrooms", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Bathrooms
        <input
          type="number"
          min={0}
          value={values.bathrooms}
          onChange={(event) => update("bathrooms", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Area (m²)
        <input
          type="number"
          min={0}
          value={values.areaSqm}
          onChange={(event) => update("areaSqm", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <ImageGalleryUpload value={values.imageUrls} onChange={(urls) => update("imageUrls", urls)} />

      <label className="flex items-center gap-2 text-sm text-[var(--color-ink)] sm:col-span-2">
        <input
          type="checkbox"
          checked={values.featured}
          onChange={(event) => update("featured", event.target.checked)}
        />
        Feature on homepage
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--color-ink)] sm:col-span-2">
        <input
          type="checkbox"
          checked={values.inHeroSlider}
          onChange={(event) => handleSliderToggle(event.target.checked)}
        />
        Feature in Hero Slider ({sliderCount}/{HERO_SLIDER_LIMIT} used)
      </label>

      {error && <p className="text-sm text-[var(--color-accent-red-text)] sm:col-span-2">{error}</p>}

      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--color-border)] px-6 py-2 text-sm text-[var(--color-ink)]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Wire diff-and-cleanup into `app/admin/dashboard/properties/page.tsx`**

Replace the file in full:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PropertyForm from "@/components/admin/PropertyForm";
import { deleteProperty, subscribeToProperties, updateProperty } from "@/lib/properties";
import { countSliderSlots, formatPrice } from "@/lib/property-utils";
import { deleteImages } from "@/lib/storage";
import type { Property, PropertyInput } from "@/lib/types";

export default function PropertiesDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToProperties(
      (next) => {
        setProperties(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Could not load properties. Check your connection and try again.");
      }
    );
    return () => unsubscribe();
  }, []);

  const editingProperty = properties.find((property) => property.id === editingId) ?? null;
  const sliderCount = countSliderSlots(properties, editingId ?? undefined);

  async function handleUpdate(values: PropertyInput) {
    if (!editingId || !editingProperty) return;
    const removedUrls = editingProperty.imageUrls.filter((url) => !values.imageUrls.includes(url));
    await updateProperty(editingId, values);
    setEditingId(null);
    if (removedUrls.length > 0) {
      deleteImages(removedUrls).catch(() => {
        // Best-effort cleanup; the Firestore update already succeeded.
      });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this property? This cannot be undone.")) return;
    const property = properties.find((p) => p.id === id);
    try {
      await deleteProperty(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete this property. Try again.");
      return;
    }
    if (property && property.imageUrls.length > 0) {
      deleteImages(property.imageUrls).catch(() => {
        // Best-effort cleanup; the Firestore delete already succeeded.
      });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Properties</h1>
        <Link
          href="/admin/dashboard/properties/new"
          className="rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Add new property
        </Link>
      </div>

      {editingProperty && (
        <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-ink)]">Edit {editingProperty.title}</h2>
          <div className="mt-4">
            <PropertyForm
              key={editingProperty.id}
              initialValues={{
                title: editingProperty.title,
                description: editingProperty.description,
                price: editingProperty.price,
                propertyType: editingProperty.propertyType,
                location: editingProperty.location,
                bedrooms: editingProperty.bedrooms,
                bathrooms: editingProperty.bathrooms,
                areaSqm: editingProperty.areaSqm,
                imageUrls: editingProperty.imageUrls,
                featured: editingProperty.featured,
                inHeroSlider: editingProperty.inHeroSlider,
              }}
              submitLabel="Save changes"
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
              sliderCount={sliderCount}
            />
          </div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading properties…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : properties.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">No properties yet. Add your first listing.</p>
        ) : (
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Title</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Price</th>
                <th className="py-3 pr-4 font-medium">Featured</th>
                <th className="py-3 pr-4 font-medium">Slider</th>
                <th className="py-3 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-b border-[var(--color-border)] text-[var(--color-ink)]">
                  <td className="py-3 pr-4">{property.title}</td>
                  <td className="py-3 pr-4">{property.propertyType}</td>
                  <td className="py-3 pr-4">{formatPrice(property.price)}</td>
                  <td className="py-3 pr-4">{property.featured ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4">{property.inHeroSlider ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => setEditingId(property.id)}
                      className="mr-3 text-[var(--color-accent-teal)] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(property.id)}
                      className="text-[var(--color-accent-red-text)] hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

`handleUpdate`'s diff is computed against `editingProperty.imageUrls` at submit time (not a value snapshotted when the form first opened) — if another admin edits the same property concurrently between "Edit" click and "Save", the diff uses the latest data. This is an accepted, documented edge case for a small internal admin tool, not a bug to solve with more state tracking.

- [ ] **Step 3: `app/admin/dashboard/properties/new/page.tsx` needs no changes**

This file constructs no `PropertyInput`/`Property` object literal itself (it renders `<PropertyForm>` with no `initialValues`, so `PropertyForm`'s own `EMPTY_FORM` — already updated in Step 1 — supplies the default `imageUrls: []`). Confirm this file still compiles cleanly after Steps 1–2; no edit needed here.

- [ ] **Step 4: Verify types, lint, and tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: `tsc` now clean (all `Property`/`PropertyInput` call sites migrated except the three remaining consumers fixed in Task 5); lint clean; 18/18 tests passing. If `tsc` still shows errors outside `components/PropertyCard.tsx`, `components/HeroSlider.tsx`, and `app/properties/[id]/page.tsx`, stop and investigate before continuing to Task 5.

- [ ] **Step 5: Commit**

```bash
git add components/admin/PropertyForm.tsx app/admin/dashboard/properties/page.tsx
git commit -m "feat: wire ImageGalleryUpload into PropertyForm with save-time Storage cleanup"
```

---

### Task 5: Update public-facing image consumers

**Files:**
- Modify: `components/PropertyCard.tsx`
- Modify: `components/HeroSlider.tsx`
- Create: `components/PropertyGallery.tsx`
- Modify: `app/properties/[id]/page.tsx`

**Interfaces:**
- Produces: default export `PropertyGallery` from `@/components/PropertyGallery`, props `{ property: Property }`, consumed by `app/properties/[id]/page.tsx`.

- [ ] **Step 1: Update the cover image in `components/PropertyCard.tsx`**

```tsx
import Link from "next/link";
import { formatPrice } from "@/lib/properties";
import type { Property } from "@/lib/types";

export default function PropertyCard({ property }: { property: Property }) {
  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block overflow-hidden rounded-xl bg-[var(--color-surface)] shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-bone)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.imageUrls[0] || "https://picsum.photos/seed/chronos-property/800/800"}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {property.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-accent-teal)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
            Featured
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">{property.propertyType}</p>
        <h3 className="mt-1 text-lg font-semibold text-[var(--color-ink)]">{property.title}</h3>
        <p className="mt-1 text-sm text-[var(--color-ink-secondary)]">{property.location}</p>
        <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-ink-secondary)]">
          <span className="text-base font-bold text-[var(--color-ink)]">{formatPrice(property.price)}</span>
          <span>
            {property.bedrooms} bd &middot; {property.bathrooms} ba &middot; {property.areaSqm} m²
          </span>
        </div>
      </div>
    </Link>
  );
}
```

Only the `src` line changed (`property.imageUrl` → `property.imageUrls[0]`).

- [ ] **Step 2: Update the background image in `components/HeroSlider.tsx`**

In the existing file, change only this line inside the `style` prop's template literal:

```tsx
              property.imageUrl || `https://picsum.photos/seed/chronos-slide-${property.id}/1920/1080`
```

to:

```tsx
              property.imageUrls[0] || `https://picsum.photos/seed/chronos-slide-${property.id}/1920/1080`
```

Nothing else in this file changes.

- [ ] **Step 3: Create `components/PropertyGallery.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Property } from "@/lib/types";

export default function PropertyGallery({ property }: { property: Property }) {
  const images =
    property.imageUrls.length > 0
      ? property.imageUrls
      : [`https://picsum.photos/seed/chronos-property-detail-${property.id}/1200/900`];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bone)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[activeIndex]} alt={property.title} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === activeIndex}
              className={`aspect-square overflow-hidden rounded-md border transition-colors ${
                index === activeIndex ? "border-[var(--color-accent-teal)]" : "border-[var(--color-border)]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

`activeIndex` is never clamped against a shrinking `images` array because `images` is derived once from a server-fetched `property` prop and never mutates client-side within this component's lifetime — same reasoning already accepted for `HeroSlider`'s `currentIndex` in an earlier plan.

- [ ] **Step 4: Use the gallery in `app/properties/[id]/page.tsx`**

Replace the file in full:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import PropertyGallery from "@/components/PropertyGallery";
import { formatPrice, getPropertyById } from "@/lib/properties";

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getPropertyById(id).catch(() => null);

  if (!property) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/properties" className="text-sm text-[var(--color-ink-secondary)] hover:underline">
        &larr; Back to catalog
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <PropertyGallery property={property} />

        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">{property.propertyType}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {property.title}
          </h1>
          <p className="mt-2 text-[var(--color-ink-secondary)]">{property.location}</p>
          <p className="mt-6 text-2xl font-medium text-[var(--color-ink)]">{formatPrice(property.price)}</p>

          <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-[var(--color-border)] py-6 text-center">
            <div>
              <dt className="text-xs uppercase text-[var(--color-ink-secondary)]">Bedrooms</dt>
              <dd className="mt-1 text-lg text-[var(--color-ink)]">{property.bedrooms}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--color-ink-secondary)]">Bathrooms</dt>
              <dd className="mt-1 text-lg text-[var(--color-ink)]">{property.bathrooms}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[var(--color-ink-secondary)]">Area</dt>
              <dd className="mt-1 text-lg text-[var(--color-ink)]">{property.areaSqm} m²</dd>
            </div>
          </dl>

          <p className="mt-8 whitespace-pre-line text-[var(--color-ink-secondary)]">{property.description}</p>

          <a
            href={`mailto:inquiries@chronos.example?subject=${encodeURIComponent(`Inquiry: ${property.title}`)}`}
            className="mt-10 inline-flex items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
          >
            Inquire about this property
          </a>
        </div>
      </div>
    </div>
  );
}
```

The static `<img>` block is replaced by `<PropertyGallery property={property} />`; everything else on the page is unchanged.

- [ ] **Step 5: Verify types, lint, and tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all clean, 18/18 tests passing — this should be the first fully-green `tsc` run since Task 1 Step 7.

- [ ] **Step 6: Commit**

```bash
git add components/PropertyCard.tsx components/HeroSlider.tsx components/PropertyGallery.tsx app/properties/\[id\]/page.tsx
git commit -m "feat: update public image consumers for the imageUrls gallery"
```

---

### Task 6: README update and full verification

**Files:**
- Modify: `README.md`

**Interfaces:** none (documentation + verification only).

- [ ] **Step 1: Add Storage to the README's setup steps**

In the "Create a Firebase project" step, add Storage to the bullet list:

```markdown
2. **Create a Firebase project**

   In the [Firebase console](https://console.firebase.google.com/), create a project and enable:
   - **Firestore** (Database)
   - **Authentication** → sign-in method → **Email/Password**
   - **Storage** (for property images)
```

In the "Deploy the security rules" step (currently titled "Deploy the Firestore security rules"), extend it to cover Storage too:

```markdown
4. **Deploy the security rules**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore   # select your project, keep the existing firestore.rules
   firebase deploy --only firestore:rules,storage
   ```

   **The app has no real write protection until this deploy happens** — for Firestore *and* Storage. Until then, `firestore.rules`/`storage.rules` aren't enforced against your project at all.
```

Renumber nothing else — steps 5–7 stay as they are, just shifted to reflect the retitled step 4.

- [ ] **Step 2: Full static verification**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```

Expected: all four pass. `npm run build` confirms nothing in this plan broke the static/dynamic route split established by earlier plans.

- [ ] **Step 3: Manual smoke test against the live Firebase project**

A real Firebase project (`chronos-a33e7`) is already linked and deployed for this app — unlike earlier plans in this repo, this feature can and should be manually verified against real Storage, not just checked for graceful degradation without one. Start the dev server and, signed in as the admin:

1. Create a new property, upload 2–3 images (mix of JPEG/PNG), confirm they appear as thumbnails with the first marked "Cover"
2. Drag to reorder the thumbnails, confirm the "Cover" badge follows the new first image
3. Remove one thumbnail, save — confirm the property detail page shows the remaining images and the removed one no longer appears
4. Edit that property again, remove another image, but click **Cancel** instead of saving — confirm the image is still present when you reopen the edit form (validates the "only delete on save" behavior)
5. Check the property's cover image renders correctly on the home page (if featured) and the catalog page
6. Try uploading a 6th+ image past a small manual gallery, or a non-image file, or an oversized file — confirm the inline error messages appear and nothing gets uploaded
7. Delete the whole property — confirm it disappears from the list (Storage cleanup for this step is best-effort/non-blocking and not directly observable from the UI, but shouldn't cause any error)

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add Storage setup step to README"
```
