# Hero Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a homepage Hero Slider that rotates through up to 5 admin-selected properties, plus the admin dashboard controls (with a hard max-5 validation) to choose which properties appear in it.

**Architecture:** `inHeroSlider: boolean` is a new field on the existing `properties` Firestore documents (no new collection, no rules change — write access is already gated behind the same admin check as every other field). `HeroSlider` is a `'use client'` presentational component that receives an already-filtered, already-limited `Property[]` as a prop and owns only its own carousel state (current index, auto-rotate timer) — it does not talk to Firestore itself, matching the existing split where Server Components fetch and Client Components render/interact. The admin form's max-5 rule is enforced client-side at the checkbox (can't ever become checked past the limit), computed from live data the two calling pages already have or fetch.

**Tech Stack:** Same as the existing app — Next.js App Router, TypeScript, Tailwind CSS v4, Firebase client SDK, Vitest.

## Global Constraints

- New field: `inHeroSlider` (boolean, default `false`) on `Property`/`PropertyInput` in `lib/types.ts`. `mapDocToProperty` must default missing/undefined Firestore data to `false`, same pattern as `featured`.
- Max 5 properties in the slider, enforced in two places: (1) the admin checkbox refuses to let a 6th be checked (client-side, immediate feedback via `window.alert`, per the exact message given: "Maximum of 5 properties can be featured in the hero slider."); (2) `getHeroSliderProperties()`'s Firestore query itself uses `limit(5)` as defense in depth.
- No Firestore composite index: `getHeroSliderProperties()` filters with `where("inHeroSlider", "==", true)` only (no `orderBy`), then sorts client-side — same pattern already used by `getFeaturedProperties()`.
- No new dependency. The carousel (fade transition, auto-rotate, arrows, dot indicators) is built with plain React state + Tailwind opacity transitions — no carousel library.
- `HeroSlider` is `'use client'`; the Firestore read (`getHeroSliderProperties()`) happens in `app/page.tsx` (a Server Component, already `force-dynamic`), which passes the result down as a `properties` prop — `HeroSlider` itself never imports `@/lib/firebase` or `@/lib/properties`.
- Per the user's decision: the slider **fully replaces** `Hero.tsx`'s search bar when there's at least one slider property. When there are zero slider properties, `app/page.tsx` falls back to rendering the existing `<Hero />` (search bar) instead — this is the "graceful fallback" the spec calls for, and it's a plain `sliderProperties.length > 0 ? <HeroSlider .../> : <Hero />` branch, not a new component.
- CTA button text is the literal, exact string `"Consulte un asesor"` (Spanish — per the user's explicit instruction, not a typo to "fix"). Per the user's decision, it links to `/properties/${property.id}` (the existing detail page) — no WhatsApp link, no modal.
- `PropertyForm`'s prop contract changes (new required `sliderCount: number` prop) — both existing call sites (`app/admin/dashboard/properties/new/page.tsx`, `app/admin/dashboard/properties/page.tsx`) are updated in the same task as the component change, so no commit in this plan has a broken build.
- `new/page.tsx` currently does no data fetching at all; it needs the current slider count before rendering the form, so it fetches once via `getAllProperties()` on mount and shows a brief loading state first. If that fetch fails (no real Firebase project yet), it degrades to `sliderCount = 0` rather than blocking the form forever — consistent with this app's established "explorable without real credentials" pattern, at the cost of the max-5 check being unenforced in that specific degraded case (acceptable: there's no real data to violate the limit against either).
- Path alias `@/*`, no `edge` runtime, `export const dynamic = "force-dynamic"` on any route that (transitively) reads Firestore — all unchanged from the existing app and apply here too.

---

### Task 1: Schema, data layer, and admin form controls

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/properties.ts`
- Modify: `lib/properties.test.ts`
- Modify: `components/admin/PropertyForm.tsx`
- Modify: `app/admin/dashboard/properties/new/page.tsx`
- Modify: `app/admin/dashboard/properties/page.tsx`

**Interfaces:**
- Produces: `Property.inHeroSlider: boolean`, `PropertyInput.inHeroSlider: boolean` (`@/lib/types`); `export const HERO_SLIDER_LIMIT = 5`, `countSliderSlots(properties: Property[], excludeId?: string): number`, `getHeroSliderProperties(): Promise<Property[]>` (`@/lib/properties`) — consumed by Task 3. `PropertyForm`'s new required prop `sliderCount: number`.
- This task is combined (schema + every consumer of the new required field) specifically so every commit in this plan compiles cleanly — splitting the type change from its two call-site fixes would leave an intermediate commit that fails `tsc`.

- [ ] **Step 1: Add `inHeroSlider` to `lib/types.ts`**

Replace the file:

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
  imageUrl: string;
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

- [ ] **Step 2: Write the failing tests for `countSliderSlots`**

Replace `lib/properties.test.ts` in full (this also adds `inHeroSlider` to every existing `Property` object literal in the file, which is required for it to compile against the new type):

```ts
import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { countSliderSlots, formatPrice, mapDocToProperty, matchesFilters } from "@/lib/properties";
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
      imageUrl: "https://example.com/house.jpg",
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
      imageUrl: "https://example.com/house.jpg",
      featured: true,
      inHeroSlider: true,
      createdAt: 1700000000000,
    });
  });

  it("fills in safe defaults for missing fields", () => {
    const property = mapDocToProperty("xyz", {});
    expect(property.title).toBe("");
    expect(property.price).toBe(0);
    expect(property.propertyType).toBe("House");
    expect(property.featured).toBe(false);
    expect(property.inHeroSlider).toBe(false);
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
    imageUrl: "",
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
      imageUrl: "",
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
```

- [ ] **Step 3: Run the tests and confirm the new ones fail**

Run: `npx vitest run lib/properties.test.ts`
Expected: FAIL — `countSliderSlots` is not exported from `lib/properties.ts` yet (and `mapDocToProperty`'s "fills in safe defaults" assertion on `inHeroSlider` also fails, since the field doesn't exist yet).

- [ ] **Step 4: Implement the data-layer changes in `lib/properties.ts`**

Replace the file in full:

```ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Property, PropertyFilters, PropertyInput } from "@/lib/types";

const PROPERTIES_COLLECTION = "properties";
export const HERO_SLIDER_LIMIT = 5;

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
    imageUrl: data.imageUrl ?? "",
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

export async function getAllProperties(): Promise<Property[]> {
  const snapshot = await getDocs(
    query(collection(db, PROPERTIES_COLLECTION), orderBy("createdAt", "desc"))
  );
  return snapshot.docs.map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data()));
}

export async function getFeaturedProperties(): Promise<Property[]> {
  // Filter only (no orderBy) to avoid requiring a Firestore composite index;
  // sort client-side instead.
  const snapshot = await getDocs(
    query(collection(db, PROPERTIES_COLLECTION), where("featured", "==", true))
  );
  return snapshot.docs
    .map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getHeroSliderProperties(): Promise<Property[]> {
  // Filter + hard limit(5) at the query level (defense in depth beyond the
  // admin form's own max-5 validation); no orderBy, to avoid requiring a
  // Firestore composite index — sort client-side instead.
  const snapshot = await getDocs(
    query(
      collection(db, PROPERTIES_COLLECTION),
      where("inHeroSlider", "==", true),
      limit(HERO_SLIDER_LIMIT)
    )
  );
  return snapshot.docs
    .map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const snapshot = await getDoc(doc(db, PROPERTIES_COLLECTION, id));
  if (!snapshot.exists()) return null;
  return mapDocToProperty(snapshot.id, snapshot.data());
}

export async function createProperty(input: PropertyInput): Promise<string> {
  const ref = await addDoc(collection(db, PROPERTIES_COLLECTION), {
    ...input,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateProperty(id: string, input: Partial<PropertyInput>): Promise<void> {
  await updateDoc(doc(db, PROPERTIES_COLLECTION, id), { ...input });
}

export async function deleteProperty(id: string): Promise<void> {
  await deleteDoc(doc(db, PROPERTIES_COLLECTION, id));
}

export function subscribeToProperties(
  onData: (properties: Property[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const propertiesQuery = query(collection(db, PROPERTIES_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    propertiesQuery,
    (snapshot) => onData(snapshot.docs.map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data()))),
    onError
  );
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run lib/properties.test.ts`
Expected: PASS — all tests green (existing 8 + 3 new `countSliderSlots` tests = 11).

- [ ] **Step 6: Add the slider checkbox and validation to `components/admin/PropertyForm.tsx`**

Replace the file in full:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { HERO_SLIDER_LIMIT } from "@/lib/properties";
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
  imageUrl: "",
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

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Image URL
        <input
          value={values.imageUrl}
          onChange={(event) => update("imageUrl", event.target.value)}
          placeholder="https://…"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

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

The `({sliderCount}/{HERO_SLIDER_LIMIT} used)` label suffix is a small addition beyond the literal spec text — it makes the limit visible before the admin hits it, directly supporting the "prevent submission" requirement's intent. Keep it.

- [ ] **Step 7: Wire `sliderCount` into `app/admin/dashboard/properties/new/page.tsx`**

Replace the file in full:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PropertyForm from "@/components/admin/PropertyForm";
import { createProperty, getAllProperties } from "@/lib/properties";
import type { PropertyInput } from "@/lib/types";

export default function NewPropertyPage() {
  const router = useRouter();
  const [sliderCount, setSliderCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllProperties()
      .then((properties) => {
        if (cancelled) return;
        setSliderCount(properties.filter((property) => property.inHeroSlider).length);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(values: PropertyInput) {
    await createProperty(values);
    router.push("/admin/dashboard/properties");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Add a property</h1>
      <div className="mt-6">
        {loaded ? (
          <PropertyForm submitLabel="Create property" onSubmit={handleSubmit} sliderCount={sliderCount} />
        ) : (
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading…</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Wire `sliderCount` into `app/admin/dashboard/properties/page.tsx`**

Replace the file in full:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PropertyForm from "@/components/admin/PropertyForm";
import { countSliderSlots, deleteProperty, formatPrice, subscribeToProperties, updateProperty } from "@/lib/properties";
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
    if (!editingId) return;
    await updateProperty(editingId, values);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this property? This cannot be undone.")) return;
    try {
      await deleteProperty(id);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not delete this property. Try again.");
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
                imageUrl: editingProperty.imageUrl,
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

Added a "Slider" column next to "Featured" — same pattern, cheap, keeps the table honest about what's already on the count.

- [ ] **Step 9: Verify types and lint across the whole task**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all clean; 11/11 tests passing.

- [ ] **Step 10: Commit**

```bash
git add lib/types.ts lib/properties.ts lib/properties.test.ts components/admin/PropertyForm.tsx app/admin/dashboard/properties/new/page.tsx app/admin/dashboard/properties/page.tsx
git commit -m "feat: add inHeroSlider field with max-5 admin validation"
```

---

### Task 2: HeroSlider component

**Files:**
- Create: `components/HeroSlider.tsx`

**Interfaces:**
- Consumes: `Property` (`@/lib/types`), `formatPrice` (`@/lib/properties`) from Task 1.
- Produces: default export `HeroSlider` from `@/components/HeroSlider`, props `{ properties: Property[] }`, consumed by Task 3.

- [ ] **Step 1: Create `components/HeroSlider.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/properties";
import type { Property } from "@/lib/types";

const AUTO_ROTATE_MS = 5000;

export default function HeroSlider({ properties }: { properties: Property[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (properties.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % properties.length);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(interval);
  }, [properties.length]);

  if (properties.length === 0) {
    return null;
  }

  function goToPrevious() {
    setCurrentIndex((prev) => (prev - 1 + properties.length) % properties.length);
  }

  function goToNext() {
    setCurrentIndex((prev) => (prev + 1) % properties.length);
  }

  return (
    <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
      {properties.map((property, index) => (
        <div
          key={property.id}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
            index === currentIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          style={{
            backgroundImage: `linear-gradient(to top right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, transparent 80%), url(${
              property.imageUrl || `https://picsum.photos/seed/chronos-slide-${property.id}/1920/1080`
            })`,
          }}
        >
          <div className="absolute bottom-8 left-8 max-w-xl">
            <h2 className="text-3xl font-bold text-white md:text-4xl">{property.title}</h2>
            <p className="mt-2 text-lg text-gray-200">
              {property.location} &middot; {formatPrice(property.price)}
            </p>
            <p className="mt-1 text-sm text-gray-300">
              {property.bedrooms} bd &middot; {property.bathrooms} ba &middot; {property.areaSqm} m²
            </p>
            <Link
              href={`/properties/${property.id}`}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
            >
              Consulte un asesor
            </Link>
          </div>
        </div>
      ))}

      {properties.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goToNext}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="absolute bottom-4 right-8 flex gap-2">
            {properties.map((property, index) => (
              <button
                key={property.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  index === currentIndex ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
```

Design notes, so implementers/reviewers don't flag these as bugs:
- All slides render simultaneously (absolutely stacked, `opacity-0`/`opacity-100`) rather than mounting/unmounting the active one — this is what makes the crossfade smooth without extra state. `pointer-events-none` on inactive slides stops their CTA links from being clickable while hidden.
- Arrows and dots only render when `properties.length > 1` — a single slide has nothing to navigate to.
- `bd`/`ba`/`m²` spec line uses `text-gray-200`/`text-gray-300` (raw Tailwind grays, not the app's `--color-*` tokens) and the title uses plain `text-white` — this matches the follow-up spec's literal class names exactly; don't "fix" it to use the design tokens.
- Auto-rotate always runs on a 5s interval regardless of manual interaction (no pause-on-hover, no reset-on-manual-click) — simplest correct reading of "supporting both manual clicking and an automatic slide rotation timer"; not a bug to add complexity to unless asked.

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/HeroSlider.tsx
git commit -m "feat: add HeroSlider component"
```

---

### Task 3: Integrate the slider into the home page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getHeroSliderProperties` (`@/lib/properties`, Task 1), `HeroSlider` (Task 2), `Hero` (existing, unchanged) as the zero-slider-properties fallback.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Hero from "@/components/Hero";
import HeroSlider from "@/components/HeroSlider";
import FeaturedProperties from "@/components/FeaturedProperties";
import AboutUs from "@/components/AboutUs";
import { getHeroSliderProperties } from "@/lib/properties";
import type { Property } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let sliderProperties: Property[] = [];
  try {
    sliderProperties = await getHeroSliderProperties();
  } catch {
    sliderProperties = [];
  }

  return (
    <>
      {sliderProperties.length > 0 ? <HeroSlider properties={sliderProperties} /> : <Hero />}
      <FeaturedProperties />
      <AboutUs />
    </>
  );
}
```

Same try/catch-to-empty-array pattern as every other Firestore read in this app (no real Firebase project yet, so this path runs by default — the page correctly falls back to `<Hero />`, which is the intended "graceful fallback" behavior, not a bug).

- [ ] **Step 2: Browser-driven verification**

Start the dev server, navigate to `http://localhost:3000`. Expected (no real Firebase project, so zero slider properties): the original `<Hero />` search bar renders, same as before this plan — this task doesn't change visible behavior until real data with `inHeroSlider: true` exists, and that's correct.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: render HeroSlider on home page when slider properties exist"
```
