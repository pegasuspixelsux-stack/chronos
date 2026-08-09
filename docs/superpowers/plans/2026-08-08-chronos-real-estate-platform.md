# Chronos Real Estate Platform (Firebase Edition) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Chronos real estate web app — a public marketing/catalog site backed by Cloud Firestore, plus a Firebase-Auth-protected admin dashboard for CRUD on property listings — on the existing Next.js App Router + Tailwind CSS v4 + TypeScript scaffold.

**Architecture:** Firebase client SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`) is the only backend — no custom API routes, no Admin SDK, no service account. Public pages are async Server Components that read Firestore directly and are marked `force-dynamic` so they always show live data and never attempt a build-time static render against a Firebase project that doesn't exist yet. The admin dashboard is a `'use client'` subtree that gates on `onAuthStateChanged` and talks to Firestore directly (`onSnapshot` for the live list, `addDoc`/`updateDoc`/`deleteDoc` for writes); Firestore security rules — not the UI guard — are what actually enforce that only signed-in users can write.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Firebase JS SDK v11 (Firestore + Auth), Vitest for pure-logic unit tests.

## Global Constraints

- Firestore collection name, fields, and types exactly as specified: `properties` — `title` (string, required), `description` (string), `price` (number, required), `propertyType` (string, required: `'House' | 'Apartment' | 'Plot'`), `location` (string, required), `bedrooms` (number), `bathrooms` (number), `areaSqm` (number), `imageUrl` (string), `featured` (boolean), `createdAt` (timestamp).
- File structure must match the spec's section 4 exactly: `app/admin/login/page.tsx`, `app/admin/dashboard/properties/page.tsx`, `app/admin/dashboard/properties/new/page.tsx`, `app/properties/page.tsx`, `app/properties/[id]/page.tsx`, `app/layout.tsx`, `app/page.tsx`, `components/Hero.tsx`, `components/FeaturedProperties.tsx`, `components/AboutUs.tsx`, `components/PropertyCard.tsx`, `components/Navbar.tsx`, `components/Footer.tsx`, `lib/firebase.ts`.
- Design direction: **changed** from the original minimalist/editorial choice to match the reference site captured in `design.md` (soldbydustin225.com) — white/off-white surfaces, charcoal text, a single teal accent (`#0e8f89`) for all CTAs/links/badges, pure sans-serif type (no serif headings), shadowed cards instead of bordered ones, square listing-thumbnail crops, generous section whitespace with denser in-card information. No dark mode in this pass (single light theme) — a deliberate scope cut, not an oversight. Competitor-specific UI (photo-count badges, "price reduced"/"new" indicators) is **not** implemented — those fields don't exist in the Firestore schema (section 3 of the spec) and adding them would be scope creep; only the `featured` badge (which the schema does have) is kept, restyled in teal.
- `next.config.ts` does **not** set `cacheComponents: true` (unchanged default). Every route that reads Firestore sets `export const dynamic = "force-dynamic"` so `next build` never tries to statically prerender it against Firebase credentials that don't exist yet.
- No Firebase project exists yet (`.env.local` ships with placeholder values). Every Server Component that reads Firestore **must** catch the read error and render a graceful fallback — the app must be fully explorable (empty states, no crashes) before real credentials are added.
- `imageUrl` is free-text admin input across arbitrary hosts, so property images render via a plain `<img>` (with an eslint-disable comment for `@next/next/no-img-element`), never `next/image` — registering every possible remote host isn't viable here.
- All code runs on the default Node.js runtime (Fluid Compute). Do not set `export const runtime = "edge"` anywhere — the Firebase client SDK's Firestore reads are not edge-compatible.
- Admin authorization model: any Firebase Auth user who can sign in is treated as authorized. Accounts are created manually in the Firebase console (no in-app signup UI) — this satisfies "restricted to authorized administrative users." The Firestore rules in Task 12 are the actual enforcement point, not the client-side route guard.
- `params` and `searchParams` are Promises in this Next.js version — always `await` them.
- Path alias `@/*` maps to the repo root (already configured in `tsconfig.json`) — use it for all internal imports.

---

### Task 1: Firebase SDK & client config

**Files:**
- Modify: `package.json` (add `firebase` dependency)
- Create: `.env.local`
- Create: `lib/firebase.ts`

**Interfaces:**
- Produces: `app: FirebaseApp`, `auth: Auth`, `db: Firestore` exported from `@/lib/firebase`, consumed by every later task that touches Firebase.

- [ ] **Step 1: Install the Firebase SDK**

```bash
npm install firebase
```

- [ ] **Step 2: Create `.env.local` with placeholder keys**

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

`.gitignore` already has a blanket `.env*` rule, so this file is never committed. Replace the placeholders with real values from the Firebase console once the project exists.

- [ ] **Step 3: Create `lib/firebase.ts`**

```ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors referencing `lib/firebase.ts`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/firebase.ts
git commit -m "feat: add Firebase client SDK and config"
```

`.env.local` is gitignored and intentionally not committed.

---

### Task 2: Domain types, Firestore data layer, and unit tests

**Files:**
- Create: `lib/types.ts`
- Create: `lib/properties.ts`
- Test: `lib/properties.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `vitest` devDependency and `test` script)

**Interfaces:**
- Consumes: `db` from `@/lib/firebase` (Task 1).
- Produces: types `PropertyType`, `Property`, `PropertyInput`, `PropertyFilters`, const `PROPERTY_TYPES` from `@/lib/types`; functions `formatPrice(price: number): string`, `mapDocToProperty(id: string, data: DocumentData): Property`, `matchesFilters(property: Property, filters: PropertyFilters): boolean`, `getAllProperties(): Promise<Property[]>`, `getFeaturedProperties(): Promise<Property[]>`, `getPropertyById(id: string): Promise<Property | null>`, `createProperty(input: PropertyInput): Promise<string>`, `updateProperty(id: string, input: Partial<PropertyInput>): Promise<void>`, `deleteProperty(id: string): Promise<void>`, `subscribeToProperties(callback: (properties: Property[]) => void): Unsubscribe` from `@/lib/properties` — all consumed by every UI task below.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add the test script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Create `lib/types.ts`**

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

- [ ] **Step 5: Write the failing tests for the pure helpers**

Create `lib/properties.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { formatPrice, mapDocToProperty, matchesFilters } from "@/lib/properties";
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
      createdAt: 1700000000000,
    });
  });

  it("fills in safe defaults for missing fields", () => {
    const property = mapDocToProperty("xyz", {});
    expect(property.title).toBe("");
    expect(property.price).toBe(0);
    expect(property.propertyType).toBe("House");
    expect(property.featured).toBe(false);
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
```

- [ ] **Step 6: Run the tests and confirm they fail**

Run: `npx vitest run lib/properties.test.ts`
Expected: FAIL — `lib/properties.ts` does not exist yet.

- [ ] **Step 7: Implement `lib/properties.ts`**

```ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Property, PropertyFilters, PropertyInput } from "@/lib/types";

const PROPERTIES_COLLECTION = "properties";

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

export function subscribeToProperties(callback: (properties: Property[]) => void): Unsubscribe {
  const propertiesQuery = query(collection(db, PROPERTIES_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(propertiesQuery, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => mapDocToProperty(docSnap.id, docSnap.data())));
  });
}
```

- [ ] **Step 8: Run the tests and confirm they pass**

Run: `npx vitest run lib/properties.test.ts`
Expected: PASS — all 8 assertions green.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/types.ts lib/properties.ts lib/properties.test.ts
git commit -m "feat: add property types, Firestore data layer, and unit tests"
```

---

### Task 3: Design tokens (`globals.css`)

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: CSS custom properties `--color-bone`, `--color-surface`, `--color-ink`, `--color-ink-secondary`, `--color-border`, `--color-accent-teal`, `--color-accent-teal-hover`, `--color-accent-red-bg`, `--color-accent-red-text` — referenced by class name (e.g. `text-[var(--color-ink)]`, `bg-[var(--color-accent-teal)]`) in every component task below. No serif font token — this direction is pure sans-serif.

- [ ] **Step 1: Replace the contents of `app/globals.css`**

```css
@import "tailwindcss";

:root {
  --color-bone: #f7f8f9;
  --color-surface: #ffffff;
  --color-ink: #1a1a1a;
  --color-ink-secondary: #5b6470;
  --color-border: #e4e7eb;
  --color-accent-teal: #0e8f89;
  --color-accent-teal-hover: #0b726d;
  --color-accent-red-bg: #fdebec;
  --color-accent-red-text: #9f2f2d;
}

@theme inline {
  --color-background: var(--color-bone);
  --color-foreground: var(--color-ink);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
  line-height: 1.6;
}
```

This drops the scaffold's `prefers-color-scheme: dark` block — dark mode is out of scope for this pass (see Global Constraints).

- [ ] **Step 2: Verify the dev server still boots**

Run: `npm run dev` in the background, then `curl -sf http://localhost:3000 >/dev/null && echo OK`
Expected: `OK` (the page still renders — this direction has no serif font token at all, per Global Constraints).

Stop the server: `lsof -ti:3000 -sTCP:LISTEN | xargs -r kill` (or the Windows equivalent — kill the `next dev` process).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: replace default theme with warm-monochrome design tokens"
```

---

### Task 4: Navbar & Footer components

**Files:**
- Create: `components/Navbar.tsx`
- Create: `components/Footer.tsx`

**Interfaces:**
- Consumes: CSS tokens from Task 3.
- Produces: default exports `Navbar` from `@/components/Navbar`, `Footer` from `@/components/Footer`, consumed by Task 5.

- [ ] **Step 1: Create `components/Navbar.tsx`**

```tsx
import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Properties" },
  { href: "/#about", label: "About" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bone)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-tight text-[var(--color-ink)]">
          Chronos
        </Link>
        <nav className="hidden gap-8 text-sm text-[var(--color-ink-secondary)] sm:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-[var(--color-ink)]">
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/properties"
          className="rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Browse listings
        </Link>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Create `components/Footer.tsx`**

```tsx
export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bone)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-12 text-sm text-[var(--color-ink-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-bold text-[var(--color-ink)]">Chronos</p>
        <p>&copy; {new Date().getFullYear()} Chronos Real Estate. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors in `components/Navbar.tsx` or `components/Footer.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/Navbar.tsx components/Footer.tsx
git commit -m "feat: add Navbar and Footer components"
```

---

### Task 5: Root layout — fonts, metadata, shell wiring

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `Navbar` (`@/components/Navbar`), `Footer` (`@/components/Footer`) from Task 4.
- Produces: the wired app shell. No serif font variable — this direction is pure sans-serif (`Geist Sans`/`Geist Mono` only), per the `design.md` reference.

- [ ] **Step 1: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chronos Real Estate",
  description: "Verified property listings — houses, apartments, and plots — curated by Chronos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify the dev server boots and the shell renders**

Run: `npm run dev` in the background, poll `curl -sf http://localhost:3000 >/dev/null`, then use the `run` skill's browser-driven pattern (dev server + screenshot) to confirm the Navbar and Footer render around the still-default page body. Kill the port when done.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wire Navbar/Footer into root layout, add Instrument Serif and metadata"
```

---

### Task 6: Hero component

**Files:**
- Create: `components/Hero.tsx`

**Interfaces:**
- Consumes: `PROPERTY_TYPES` from `@/lib/types` (Task 2).
- Produces: default export `Hero` from `@/components/Hero`, consumed by Task 9.

- [ ] **Step 1: Create `components/Hero.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PROPERTY_TYPES } from "@/lib/types";

const HERO_IMAGE_URL = "https://picsum.photos/seed/chronos-hero/1920/1080";

export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [location, setLocation] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (propertyType) params.set("propertyType", propertyType);
    if (location) params.set("location", location);
    router.push(`/properties${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <section
      className="relative bg-cover bg-center px-6 py-28 sm:py-36"
      style={{
        backgroundImage: `linear-gradient(rgba(15,15,15,0.55), rgba(15,15,15,0.55)), url(${HERO_IMAGE_URL})`,
      }}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
          Find a home that fits your next chapter.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
          Chronos curates verified listings across houses, apartments, and land — so you spend less time
          searching and more time deciding.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-lg sm:flex-row"
        >
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by keyword"
            className="flex-1 rounded-md border border-transparent bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-border)]"
          />
          <select
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
          >
            <option value="">Any type</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-border)]"
          />
          <button
            type="submit"
            className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
          >
            Search
          </button>
        </form>
      </div>
    </section>
  );
}
```

The hero now uses a full-bleed background photo with a dark overlay (for text legibility) and a floating white search card, matching `design.md`'s "full-width image with overlay text and search bar" pattern. `HERO_IMAGE_URL` is a placeholder — swap for a real photo once one exists.

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/Hero.tsx
git commit -m "feat: add Hero component with search/filter bar"
```

---

### Task 7: PropertyCard & FeaturedProperties

**Files:**
- Create: `components/PropertyCard.tsx`
- Create: `components/FeaturedProperties.tsx`

**Interfaces:**
- Consumes: `Property` type (`@/lib/types`), `formatPrice` and `getFeaturedProperties` (`@/lib/properties`) from Task 2.
- Produces: default exports `PropertyCard` from `@/components/PropertyCard`, `FeaturedProperties` from `@/components/FeaturedProperties`, consumed by Tasks 9 and 10.

- [ ] **Step 1: Create `components/PropertyCard.tsx`**

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
          src={property.imageUrl || "https://picsum.photos/seed/chronos-property/800/800"}
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

Square thumbnail crop, shadow instead of a border, and a solid-teal badge — matching `design.md`'s card/badge pattern instead of the original pastel-outline treatment.

- [ ] **Step 2: Create `components/FeaturedProperties.tsx`**

```tsx
import PropertyCard from "@/components/PropertyCard";
import { getFeaturedProperties } from "@/lib/properties";
import type { Property } from "@/lib/types";

export default async function FeaturedProperties() {
  let properties: Property[] = [];
  let loadError = false;
  try {
    properties = await getFeaturedProperties();
  } catch {
    loadError = true;
  }

  return (
    <section id="featured" className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">Featured listings</h2>

      {loadError ? (
        <p className="mt-4 text-[var(--color-ink-secondary)]">
          Listings are temporarily unavailable. Check the Firebase configuration in{" "}
          <code className="rounded bg-[var(--color-bone)] px-1.5 py-0.5 font-mono text-[0.9em]">.env.local</code>.
        </p>
      ) : properties.length === 0 ? (
        <p className="mt-4 text-[var(--color-ink-secondary)]">
          No featured properties yet. Check back soon, or browse the full catalog.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (the `eslint-disable-next-line` comment suppresses the expected `no-img-element` warning).

- [ ] **Step 4: Commit**

```bash
git add components/PropertyCard.tsx components/FeaturedProperties.tsx
git commit -m "feat: add PropertyCard and FeaturedProperties (with graceful Firestore-error fallback)"
```

---

### Task 8: AboutUs component

**Files:**
- Create: `components/AboutUs.tsx`

**Interfaces:**
- Consumes: CSS tokens from Task 3.
- Produces: default export `AboutUs` from `@/components/AboutUs`, consumed by Task 9.

- [ ] **Step 1: Create `components/AboutUs.tsx`**

```tsx
const VALUES = [
  {
    title: "Verified listings",
    description:
      "Every property on Chronos is reviewed by our team before it goes live, so what you see is what's actually for sale.",
  },
  {
    title: "Local expertise",
    description:
      "Our agents work the neighborhoods they list in, and can walk you through zoning, resale value, and commute realities.",
  },
  {
    title: "No pressure process",
    description: "Browse, shortlist, and inquire on your own timeline. We follow up when you ask us to, not before.",
  },
];

export default function AboutUs() {
  return (
    <section id="about" className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Built on trust, not just transactions
          </h2>
          <p className="mt-4 text-[var(--color-ink-secondary)]">
            Chronos has helped buyers and renters navigate the market since day one. We keep our catalog small
            enough to vet personally, and large enough to give you real choice.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {VALUES.map((value) => (
            <div key={value.title} className="border-t border-[var(--color-border)] pt-6">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">{value.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add components/AboutUs.tsx
git commit -m "feat: add AboutUs component"
```

---

### Task 9: Home page assembly

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Hero` (Task 6), `FeaturedProperties` (Task 7), `AboutUs` (Task 8).

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import AboutUs from "@/components/AboutUs";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedProperties />
      <AboutUs />
    </>
  );
}
```

- [ ] **Step 2: Browser-driven verification**

Start the dev server (`npm run dev &`, poll port 3000), then use the `run` skill's browser pattern: navigate to `http://localhost:3000`, screenshot, and confirm the Hero headline, the "No featured properties yet" empty state (no real Firebase project yet, so this is expected), and the About section all render with no console errors. Kill the port when done.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: assemble home page from Hero, FeaturedProperties, AboutUs"
```

---

### Task 10: Public property catalog page

**Files:**
- Create: `app/properties/page.tsx`

**Interfaces:**
- Consumes: `getAllProperties`, `matchesFilters` (`@/lib/properties`), `PropertyCard` (Task 7), `PROPERTY_TYPES`, `Property`, `PropertyType` (`@/lib/types`).

- [ ] **Step 1: Create `app/properties/page.tsx`**

```tsx
import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import { getAllProperties, matchesFilters } from "@/lib/properties";
import { PROPERTY_TYPES, type Property, type PropertyType } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const searchQuery = typeof params.query === "string" ? params.query : undefined;
  const propertyType =
    typeof params.propertyType === "string" ? (params.propertyType as PropertyType) : undefined;
  const location = typeof params.location === "string" ? params.location : undefined;

  let properties: Property[] = [];
  let loadError = false;
  try {
    properties = await getAllProperties();
  } catch {
    loadError = true;
  }

  const filtered = properties.filter((property) =>
    matchesFilters(property, { query: searchQuery, propertyType, location })
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">Property catalog</h1>
        <p className="mt-3 text-[var(--color-ink-secondary)]">
          {filtered.length} {filtered.length === 1 ? "listing" : "listings"}
          {location ? ` in ${location}` : ""}
          {propertyType ? ` · ${propertyType}` : ""}
        </p>
      </div>

      <form className="mt-8 flex flex-wrap gap-3 border-b border-[var(--color-border)] pb-8" method="get">
        <input
          type="text"
          name="query"
          defaultValue={searchQuery ?? ""}
          placeholder="Search by keyword"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
        />
        <select
          name="propertyType"
          defaultValue={propertyType ?? ""}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
        >
          <option value="">Any type</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="location"
          defaultValue={location ?? ""}
          placeholder="Location"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Filter
        </button>
        {(searchQuery || propertyType || location) && (
          <Link
            href="/properties"
            className="flex items-center px-3 text-sm text-[var(--color-ink-secondary)] underline-offset-2 hover:underline"
          >
            Clear filters
          </Link>
        )}
      </form>

      {loadError ? (
        <p className="mt-12 text-[var(--color-ink-secondary)]">
          Listings are temporarily unavailable. Check the Firebase configuration in{" "}
          <code className="rounded bg-[var(--color-bone)] px-1.5 py-0.5 font-mono text-[0.9em]">.env.local</code>.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-12 text-[var(--color-ink-secondary)]">No properties match those filters yet.</p>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
```

The filter form uses plain `method="get"` — no client JS needed; the server re-renders from `searchParams`.

- [ ] **Step 2: Browser-driven verification**

With the dev server running, navigate to `http://localhost:3000/properties` and `http://localhost:3000/properties?propertyType=House&location=Denver`. Screenshot both. Expected: the empty-state message (no Firebase project yet), filter inputs reflecting the URL params, and no console errors.

- [ ] **Step 3: Commit**

```bash
git add app/properties/page.tsx
git commit -m "feat: add public property catalog page with server-rendered filtering"
```

---

### Task 11: Property detail page

**Files:**
- Create: `app/properties/[id]/page.tsx`

**Interfaces:**
- Consumes: `getPropertyById`, `formatPrice` (`@/lib/properties`).

- [ ] **Step 1: Create `app/properties/[id]/page.tsx`**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
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
        <div className="aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bone)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={property.imageUrl || "https://picsum.photos/seed/chronos-property-detail/1200/900"}
            alt={property.title}
            className="h-full w-full object-cover"
          />
        </div>

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

`getPropertyById` throwing (no Firebase project yet) or returning `null` (unknown id) both fall through to `.catch(() => null)` and Next's built-in `notFound()` 404 page — no custom `not-found.tsx` needed for this pass.

- [ ] **Step 2: Browser-driven verification**

Navigate to `http://localhost:3000/properties/does-not-exist`. Expected: Next's default 404 page, no console error (a caught Firestore error, not a crash).

- [ ] **Step 3: Commit**

```bash
git add app/properties/\[id\]/page.tsx
git commit -m "feat: add property detail page"
```

---

### Task 12: Firestore security rules

**Files:**
- Create: `firestore.rules`
- Create: `firebase.json`

**Interfaces:**
- None (infrastructure config; not imported by app code).

- [ ] **Step 1: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /properties/{propertyId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
  }
}
```

Public read (the catalog and home page are unauthenticated); writes require a signed-in Firebase Auth user, which is what actually enforces "admin-only" — the `/admin` route guard in Tasks 13–14 is a UX convenience, not the security boundary.

- [ ] **Step 2: Create `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 3: Manual follow-up (cannot run until the real Firebase project exists)**

Document this for the user rather than executing it:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select the real project, keep firestore.rules
firebase deploy --only firestore:rules
```

- [ ] **Step 4: Commit**

```bash
git add firestore.rules firebase.json
git commit -m "feat: add Firestore security rules (public read, authenticated write)"
```

---

### Task 13: Admin login page

**Files:**
- Create: `app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `auth` from `@/lib/firebase` (Task 1).

- [ ] **Step 1: Create `app/admin/login/page.tsx`**

```tsx
"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { auth } from "@/lib/firebase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard/properties");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">Admin sign in</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">Restricted to authorized Chronos staff.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
          />
        </label>

        {error && <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Browser-driven verification**

Navigate to `http://localhost:3000/admin/login`, submit `test@example.com` / `wrongpassword`. Expected: "Invalid email or password." message, no console crash — this confirms the auth error path is caught (there's no real Firebase project yet, so this will fail on the config-invalid path too, which is exactly what the try/catch should absorb).

- [ ] **Step 3: Commit**

```bash
git add app/admin/login/page.tsx
git commit -m "feat: add admin login page"
```

---

### Task 14: Admin dashboard auth-guard layout

**Files:**
- Create: `app/admin/dashboard/layout.tsx`

**Interfaces:**
- Consumes: `auth` from `@/lib/firebase` (Task 1).

- [ ] **Step 1: Create `app/admin/dashboard/layout.tsx`**

```tsx
"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
      if (!currentUser) {
        router.replace("/admin/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-sm text-[var(--color-ink-secondary)]">
        Checking session…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between border-b border-[var(--color-border)] pb-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Chronos Admin</p>
          <p className="mt-1 text-sm text-[var(--color-ink)]">{user.email}</p>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-ink)] hover:bg-[var(--color-bone)]"
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Browser-driven verification**

Navigate directly to `http://localhost:3000/admin/dashboard/properties` (a route that doesn't exist as a page yet — expect a 404 from the missing `page.tsx`, but confirm in `read_console_messages` that the layout didn't throw). This task is fully verifiable once Task 16 adds the page underneath it; note that dependency and move on.

- [ ] **Step 3: Commit**

```bash
git add app/admin/dashboard/layout.tsx
git commit -m "feat: add admin dashboard auth-guard layout"
```

---

### Task 15: Admin PropertyForm & create-new page

**Files:**
- Create: `components/admin/PropertyForm.tsx`
- Create: `app/admin/dashboard/properties/new/page.tsx`

**Interfaces:**
- Consumes: `PropertyInput`, `PropertyType`, `PROPERTY_TYPES` (`@/lib/types`), `createProperty` (`@/lib/properties`).
- Produces: default export `PropertyForm` from `@/components/admin/PropertyForm`, props `{ initialValues?: PropertyInput; submitLabel: string; onSubmit: (values: PropertyInput) => Promise<void>; onCancel?: () => void }`, consumed by Task 16.

- [ ] **Step 1: Create `components/admin/PropertyForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
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
};

export default function PropertyForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues?: PropertyInput;
  submitLabel: string;
  onSubmit: (values: PropertyInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<PropertyInput>(initialValues ?? EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch {
      setError("Could not save this property. Check your connection and try again.");
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
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Description
        <textarea
          rows={4}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
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
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Property type
        <select
          value={values.propertyType}
          onChange={(event) => update("propertyType", event.target.value as PropertyType)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
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
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Bedrooms
        <input
          type="number"
          min={0}
          value={values.bedrooms}
          onChange={(event) => update("bedrooms", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Bathrooms
        <input
          type="number"
          min={0}
          value={values.bathrooms}
          onChange={(event) => update("bathrooms", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Area (m²)
        <input
          type="number"
          min={0}
          value={values.areaSqm}
          onChange={(event) => update("areaSqm", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Image URL
        <input
          value={values.imageUrl}
          onChange={(event) => update("imageUrl", event.target.value)}
          placeholder="https://…"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none"
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

- [ ] **Step 2: Create `app/admin/dashboard/properties/new/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import PropertyForm from "@/components/admin/PropertyForm";
import { createProperty } from "@/lib/properties";
import type { PropertyInput } from "@/lib/types";

export default function NewPropertyPage() {
  const router = useRouter();

  async function handleSubmit(values: PropertyInput) {
    await createProperty(values);
    router.push("/admin/dashboard/properties");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Add a property</h1>
      <div className="mt-6">
        <PropertyForm submitLabel="Create property" onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add components/admin/PropertyForm.tsx app/admin/dashboard/properties/new/page.tsx
git commit -m "feat: add reusable PropertyForm and admin create-property page"
```

---

### Task 16: Admin properties list — realtime sync, edit, delete

**Files:**
- Create: `app/admin/dashboard/properties/page.tsx`

**Interfaces:**
- Consumes: `subscribeToProperties`, `updateProperty`, `deleteProperty`, `formatPrice` (`@/lib/properties`), `Property`, `PropertyInput` (`@/lib/types`), `PropertyForm` (Task 15).

- [ ] **Step 1: Create `app/admin/dashboard/properties/page.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PropertyForm from "@/components/admin/PropertyForm";
import { deleteProperty, formatPrice, subscribeToProperties, updateProperty } from "@/lib/properties";
import type { Property, PropertyInput } from "@/lib/types";

export default function PropertiesDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToProperties((next) => {
      setProperties(next);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const editingProperty = properties.find((property) => property.id === editingId) ?? null;

  async function handleUpdate(values: PropertyInput) {
    if (!editingId) return;
    await updateProperty(editingId, values);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this property? This cannot be undone.")) return;
    await deleteProperty(id);
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
              }}
              submitLabel="Save changes"
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
            />
          </div>
        </div>
      )}

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading properties…</p>
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

- [ ] **Step 2: Browser-driven verification**

Navigate to `http://localhost:3000/admin/dashboard/properties`. Expected: redirected to `/admin/login` (no authenticated session yet, exactly what the Task 14 guard should do). This confirms the full route tree resolves without crashing; live CRUD verification needs a real Firebase project and a manually created admin account (see Task 17).

- [ ] **Step 3: Commit**

```bash
git add app/admin/dashboard/properties/page.tsx
git commit -m "feat: add admin properties list with realtime sync, inline edit, and delete"
```

---

### Task 17: Full smoke test

**Files:** none — verification only.

- [ ] **Step 1: Static checks**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```

Expected: all four pass. `npm run build` in particular confirms every `force-dynamic` route was correctly excluded from static generation (no build-time Firestore calls against placeholder credentials).

- [ ] **Step 2: Browser-driven walkthrough (use the `run` skill's playbook)**

Start `npm run dev`, poll port 3000, then drive: `/` (Hero + empty-state Featured + About) → `/properties` (empty-state catalog, apply a filter via the form, clear it) → `/properties/anything` (404) → `/admin/login` (submit bad credentials, see the friendly error) → `/admin/dashboard/properties` (redirects to `/admin/login`). Screenshot each step, and run `read_console_messages` with `onlyErrors: true` after each navigation — expect zero uncaught errors (Firestore failures should all be caught and rendered as fallback UI, not thrown).

- [ ] **Step 3: Document the Firebase-dependent gap for the user**

Report plainly (not a code step): full end-to-end verification of Firestore reads/writes and Firebase Auth sign-in requires the user's real Firebase project — `.env.local` filled in with real keys, at least one property document seeded, an admin user created in the Firebase console, and `firestore.rules` deployed (Task 12, Step 3). None of that can run in this environment without those credentials.
