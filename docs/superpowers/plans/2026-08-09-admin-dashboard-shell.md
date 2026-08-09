# Admin Dashboard Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent sidebar-navigation admin shell for Chronos — Control Panel, Properties, Leads, Users, Configuration Settings — with every number and feature backed by real data. Replaces the current bare admin layout, and fixes a pre-existing issue where the public site's Navbar/Footer wrap every admin page too.

**Architecture:** A new `app/(site)/` route group holds the public pages (home, catalog, detail) and owns the public `Navbar`/`Footer` chrome that currently lives in the root layout; `/admin/*` routes are siblings of that group and get their own shell instead. `app/admin/dashboard/layout.tsx` keeps its existing `onAuthStateChanged` auth guard unchanged, now rendering a new `components/admin/Sidebar.tsx` (client component, `lucide-react` icons) alongside page content. Three new Firestore collections — `leads`, `admins` (existing, newly self-service-writable), `settings` — each get a thin CRUD module in `lib/` following the established `lib/properties.ts` pattern, with pure/testable logic split into Firebase-free `lib/lead-utils.ts` (mirroring `lib/property-utils.ts`). A new public `InquiryForm` component replaces the property detail page's `mailto:` link with a real Firestore-backed lead-capture form.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, Firebase JS SDK (Firestore + Auth + Storage), Vitest, `lucide-react` (new dependency).

**Design doc:** `docs/superpowers/specs/2026-08-09-admin-dashboard-shell-design.md`

## Global Constraints

- **Routes & branding unchanged from the original ask's snippet:** everything stays under the existing `/admin/dashboard/*` prefix and "Chronos" branding — the pasted reference snippet's `/dashboard/*` routes and "Oikos Admin" title are not adopted (see design doc's Context section for why).
- **Route group refactor:** `app/page.tsx`, `app/properties/page.tsx`, `app/properties/[id]/page.tsx` move (unchanged content, `mv` only) into `app/(site)/` — a route group, so URLs (`/`, `/properties`, `/properties/[id]`) do not change. `app/layout.tsx` (root) stops rendering `Navbar`/`Footer`; a new `app/(site)/layout.tsx` renders them for just that group. `/admin/*` routes, as siblings of `(site)/`, stop inheriting public chrome.
- **`admins/{uid}` security change (explicitly approved):** `firestore.rules` moves this collection from `allow read, write: if false` (Console/CLI only) to `allow read, write: if isAdmin()`. Any signed-in admin can now grant admin access to any UID they type, with no verification it's a real account. Mitigations: every admin doc gets `addedBy`/`addedAt` audit fields; the Users page UI blocks removing your own access (lockout prevention, not a security boundary).
- **No Admin SDK, no server routes** — unchanged architecture. The Users page manages the `admins` allowlist directly via client-side Firestore calls, same trust model as every other admin write in this app. Admin *account* creation (email/password) still happens manually in the Firebase Console.
- **KPIs are real, not the pasted snippet's rental-business metrics.** No occupancy, no revenue, no true sales-conversion tracking (Chronos doesn't record sale outcomes). "Response Rate" = % of leads no longer in `"new"` status — an honest proxy, not a fabricated one.
- **Activity feed** merges only two real event types (new leads, newly-created properties) — no "property updates" (no `updatedAt` field exists or is added here) and no "system events" (nothing in this app produces any).
- **`leads/{leadId}` create is public** (site visitors aren't signed in) but validated at the rules level: required fields present, size caps, and `status` must start as `"new"` — defense against a malicious client injecting garbage or a pre-closed lead.
- **`settings/site` is a single fixed document**, not a collection — `setDoc(..., { merge: true })`, never `addDoc`.
- **Accepted, unavoidable bundle cost:** `InquiryForm` is a public client component that must write to Firestore directly (no server route exists to proxy it), so the property detail page's client bundle now includes the Firestore SDK. This is inherent to the "client SDK only" architecture for a public write, not a bug to route around — unlike the `HeroSlider`/`PropertyGallery` bundle issues fixed in earlier plans, which were *avoidable* imports of Firebase code a component didn't actually need.
- **Pure logic stays Firebase-free where it doesn't need real-time Firestore data:** `lib/lead-utils.ts` (new) mirrors `lib/property-utils.ts` — pure, Vitest-tested functions (`calculateResponseRate`, `countNewLeadsSince`, `mapDocToLead`) live there; `lib/leads.ts` re-exports them alongside its own Firestore CRUD functions, matching the established `lib/properties.ts` re-export pattern.
- **`subscribeToAdmins` must not use Firestore `orderBy` on `addedAt`.** Firestore's `orderBy` excludes documents missing the ordered field entirely — and the very first admin account (created manually via the Firebase Console, per the existing README flow, before this feature existed) has no `addedAt` field at all. Sort client-side instead, so that account still appears in the list.
- **Rules are deployed once, early** (Task 1, immediately after being written) — same precedent as the property-image-gallery plan's Task 2, so a syntax error surfaces immediately rather than at the end of a 9-task plan.
- Path alias `@/*`, no `edge` runtime, `export const dynamic = "force-dynamic"` on Firestore-reading Server Component routes — all unchanged, apply here too where relevant.
- A real Firebase project (`chronos-a33e7`) is live and linked (`.firebaserc`, `firebase` CLI already authenticated in this environment).

---

### Task 1: Types and Firestore/Storage rules

**Files:**
- Modify: `lib/types.ts`
- Modify: `firestore.rules`
- Modify: `storage.rules`

**Interfaces:**
- Produces: `LeadStatus`, `Lead`, `LeadInput`, `SiteSettings`, `AdminEntry` (`@/lib/types`) — consumed by every later task.

- [ ] **Step 1: Add the new types to `lib/types.ts`**

Add these exports (the file's existing `PropertyType`/`Property`/`PropertyInput`/`PropertyFilters` content is unchanged — append below it):

```ts
export type LeadStatus = "new" | "contacted" | "closed";

export interface Lead {
  id: string;
  propertyId: string;
  propertyTitle: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: LeadStatus;
  createdAt: number;
}

export type LeadInput = Omit<Lead, "id" | "createdAt">;

export interface SiteSettings {
  logoUrl: string;
  businessName: string;
  address: string;
  phone: string;
  whatsappNumber: string;
}

export interface AdminEntry {
  uid: string;
  addedBy: string;
  addedAt: number;
}
```

- [ ] **Step 2: Update `firestore.rules`**

Replace the file in full:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /properties/{propertyId} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
    }

    match /admins/{adminId} {
      allow read, write: if isAdmin();
    }

    match /leads/{leadId} {
      allow read, update, delete: if isAdmin();
      allow create: if request.resource.data.keys().hasAll(
          ['propertyId', 'propertyTitle', 'name', 'email', 'message', 'status', 'createdAt']
        )
        && request.resource.data.status == 'new'
        && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 200
        && request.resource.data.email is string && request.resource.data.email.size() > 0 && request.resource.data.email.size() <= 200
        && request.resource.data.message is string && request.resource.data.message.size() <= 5000;
    }

    match /settings/{settingId} {
      allow read, write: if isAdmin();
    }

    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
  }
}
```

- [ ] **Step 3: Update `storage.rules`**

Replace the file in full — adds a `site/{fileName}` block (for the logo upload in Task 8), identical shape to the existing `property-images` block:

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

    match /site/{fileName} {
      allow read: if true;
      allow write: if isAdmin()
        && request.resource.size <= 5 * 1024 * 1024
        && request.resource.contentType.matches('image/(jpeg|png|webp)');
      allow delete: if isAdmin();
    }
  }
}
```

- [ ] **Step 4: Deploy both rules files to the live project**

```bash
firebase deploy --only firestore:rules,storage
```

Expected: `Deploy complete!` for both. If either fails with a compilation error, fix the rules file and redeploy before continuing — do not proceed to Task 2 with unverified rules syntax.

- [ ] **Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: clean — this task only adds new, unreferenced type exports; nothing yet imports them, so there's nothing to break.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts firestore.rules storage.rules
git commit -m "feat: add Lead/SiteSettings/AdminEntry types, self-service admins rule, leads/settings/site rules"
```

---

### Task 2: Data layer (leads, admins, settings)

**Files:**
- Create: `lib/lead-utils.ts`
- Create: `lib/leads.ts`
- Create: `lib/leads.test.ts`
- Create: `lib/admins.ts`
- Create: `lib/settings.ts`
- Modify: `lib/storage.ts`

**Interfaces:**
- Produces: `mapDocToLead`, `calculateResponseRate`, `countNewLeadsSince` (`@/lib/lead-utils`); `getAllLeads`, `createLead`, `subscribeToLeads`, `updateLeadStatus` (`@/lib/leads`, which also re-exports the three `lead-utils` functions above); `subscribeToAdmins`, `addAdmin`, `removeAdmin` (`@/lib/admins`); `getSiteSettings`, `updateSiteSettings` (`@/lib/settings`); `uploadSiteLogo` (`@/lib/storage`) — all consumed by Tasks 4-8.

- [ ] **Step 1: Write the failing tests in `lib/leads.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { calculateResponseRate, countNewLeadsSince, mapDocToLead } from "@/lib/lead-utils";
import type { Lead } from "@/lib/types";

describe("mapDocToLead", () => {
  it("maps a Firestore document into a Lead, converting the timestamp to millis", () => {
    const createdAt = Timestamp.fromMillis(1700000000000);
    const lead = mapDocToLead("lead1", {
      propertyId: "prop1",
      propertyTitle: "Hillside Cottage",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
      message: "Interested in a viewing.",
      status: "new",
      createdAt,
    });

    expect(lead).toEqual({
      id: "lead1",
      propertyId: "prop1",
      propertyTitle: "Hillside Cottage",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
      message: "Interested in a viewing.",
      status: "new",
      createdAt: 1700000000000,
    });
  });

  it("fills in safe defaults for missing fields", () => {
    const lead = mapDocToLead("lead2", {});
    expect(lead.name).toBe("");
    expect(lead.status).toBe("new");
  });
});

describe("calculateResponseRate", () => {
  function makeLead(overrides: Partial<Lead>): Lead {
    return {
      id: "id",
      propertyId: "prop",
      propertyTitle: "Property",
      name: "Name",
      email: "email@example.com",
      phone: "",
      message: "",
      status: "new",
      createdAt: 0,
      ...overrides,
    };
  }

  it("returns 0 when there are no leads", () => {
    expect(calculateResponseRate([])).toBe(0);
  });

  it("returns 0 when every lead is still new", () => {
    const leads = [makeLead({ status: "new" }), makeLead({ status: "new" })];
    expect(calculateResponseRate(leads)).toBe(0);
  });

  it("returns 100 when every lead has been responded to", () => {
    const leads = [makeLead({ status: "contacted" }), makeLead({ status: "closed" })];
    expect(calculateResponseRate(leads)).toBe(100);
  });

  it("returns the rounded percentage for a mixed set", () => {
    const leads = [makeLead({ status: "new" }), makeLead({ status: "contacted" }), makeLead({ status: "closed" })];
    expect(calculateResponseRate(leads)).toBe(67);
  });
});

describe("countNewLeadsSince", () => {
  function makeLead(createdAt: number): Lead {
    return {
      id: "id",
      propertyId: "prop",
      propertyTitle: "Property",
      name: "Name",
      email: "email@example.com",
      phone: "",
      message: "",
      status: "new",
      createdAt,
    };
  }

  it("counts leads created at or after the cutoff", () => {
    const leads = [makeLead(1000), makeLead(2000), makeLead(3000)];
    expect(countNewLeadsSince(leads, 2000)).toBe(2);
  });

  it("excludes leads created before the cutoff", () => {
    expect(countNewLeadsSince([makeLead(500)], 1000)).toBe(0);
  });

  it("returns 0 for an empty list", () => {
    expect(countNewLeadsSince([], 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run lib/leads.test.ts`
Expected: FAIL — `lib/lead-utils.ts` doesn't exist yet.

- [ ] **Step 3: Create `lib/lead-utils.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run lib/leads.test.ts`
Expected: PASS — all 9 assertions green.

- [ ] **Step 5: Create `lib/leads.ts`**

```ts
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapDocToLead } from "@/lib/lead-utils";
import type { Lead, LeadInput, LeadStatus } from "@/lib/types";

const LEADS_COLLECTION = "leads";

export { mapDocToLead, calculateResponseRate, countNewLeadsSince } from "@/lib/lead-utils";

export async function getAllLeads(): Promise<Lead[]> {
  const snapshot = await getDocs(query(collection(db, LEADS_COLLECTION), orderBy("createdAt", "desc")));
  return snapshot.docs.map((docSnap) => mapDocToLead(docSnap.id, docSnap.data()));
}

export async function createLead(input: LeadInput): Promise<string> {
  const ref = await addDoc(collection(db, LEADS_COLLECTION), {
    ...input,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export function subscribeToLeads(
  onData: (leads: Lead[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const leadsQuery = query(collection(db, LEADS_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(
    leadsQuery,
    (snapshot) => onData(snapshot.docs.map((docSnap) => mapDocToLead(docSnap.id, docSnap.data()))),
    onError
  );
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  await updateDoc(doc(db, LEADS_COLLECTION, id), { status });
}
```

- [ ] **Step 6: Create `lib/admins.ts`**

```ts
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  type DocumentData,
  type FirestoreError,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AdminEntry } from "@/lib/types";

const ADMINS_COLLECTION = "admins";

function mapDocToAdmin(uid: string, data: DocumentData): AdminEntry {
  const addedAt = data.addedAt instanceof Timestamp ? data.addedAt.toMillis() : Date.now();
  return { uid, addedBy: data.addedBy ?? "", addedAt };
}

export function subscribeToAdmins(
  onData: (admins: AdminEntry[]) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  // No orderBy here deliberately: Firestore's orderBy excludes documents
  // missing the ordered field entirely, and the very first admin (created
  // manually via the Firebase Console, before this feature existed) has no
  // addedAt field at all. Sort client-side so that account still appears.
  return onSnapshot(
    collection(db, ADMINS_COLLECTION),
    (snapshot) => {
      const admins = snapshot.docs.map((docSnap) => mapDocToAdmin(docSnap.id, docSnap.data()));
      onData(admins.sort((a, b) => b.addedAt - a.addedAt));
    },
    onError
  );
}

export async function addAdmin(uid: string, addedByUid: string): Promise<void> {
  await setDoc(doc(db, ADMINS_COLLECTION, uid), {
    addedBy: addedByUid,
    addedAt: Timestamp.now(),
  });
}

export async function removeAdmin(uid: string): Promise<void> {
  await deleteDoc(doc(db, ADMINS_COLLECTION, uid));
}
```

- [ ] **Step 7: Create `lib/settings.ts`**

```ts
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
```

- [ ] **Step 8: Add `uploadSiteLogo` to `lib/storage.ts`**

The file currently ends with `deleteImages`. Add this new export at the end of the file (the existing `uploadPropertyImage`, `deleteImages`, and the private `getFirebaseStorage` are unchanged):

```ts
const SITE_LOGO_PATH = "site/logo";

export async function uploadSiteLogo(file: File): Promise<string> {
  const storageRef = ref(getFirebaseStorage(), SITE_LOGO_PATH);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
```

Fixed path (no UUID) so each new logo upload overwrites the previous one rather than accumulating orphaned files — same reasoning as `uploadPropertyImage`'s per-file UUID path, applied to a "there's only ever one current logo" case instead.

- [ ] **Step 9: Verify types, lint, and tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all clean; 9 new tests passing (plus the 23 already in the suite from prior plans = 32 total).

- [ ] **Step 10: Commit**

```bash
git add lib/lead-utils.ts lib/leads.ts lib/leads.test.ts lib/admins.ts lib/settings.ts lib/storage.ts
git commit -m "feat: add leads, admins, and settings data layer"
```

---

### Task 3: Split public/admin root chrome

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(site)/layout.tsx`
- Move: `app/page.tsx` → `app/(site)/page.tsx`
- Move: `app/properties/page.tsx` → `app/(site)/properties/page.tsx`
- Move: `app/properties/[id]/page.tsx` → `app/(site)/properties/[id]/page.tsx`

**Interfaces:** none new — this task only relocates existing files and moves `Navbar`/`Footer` rendering to a narrower scope. No behavior change for public routes; `/admin/*` routes stop inheriting public chrome.

- [ ] **Step 1: Create the `app/(site)/` directory and move the three public page files into it**

```bash
mkdir -p "app/(site)/properties/[id]"
mv app/page.tsx "app/(site)/page.tsx"
mv app/properties/page.tsx "app/(site)/properties/page.tsx"
mv "app/properties/[id]/page.tsx" "app/(site)/properties/[id]/page.tsx"
rmdir "app/properties/[id]" app/properties
```

File contents are unchanged by this move — `(site)` is a route group (parentheses), so it contributes nothing to the URL: `/`, `/properties`, and `/properties/[id]` resolve exactly as they did before.

- [ ] **Step 2: Create `app/(site)/layout.tsx`**

```tsx
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 3: Strip `Navbar`/`Footer` out of the root `app/layout.tsx`**

Replace the file in full:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
```

`body` keeps `flex min-h-full flex-col` so that `(site)/layout.tsx`'s `flex-1` div can grow to fill it — the flex-column-with-sticky-footer behavior is preserved, just split across two layout files instead of one.

- [ ] **Step 4: Verify types, lint, and tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all clean.

- [ ] **Step 5: Browser-driven verification**

Start the dev server, poll port 3000. Navigate to `/`, `/properties`, `/properties/<any-id>` — confirm Navbar/Footer still render exactly as before (visually unchanged). Navigate to `/admin/login` — confirm the public Navbar/Footer are now **gone** (this route no longer inherits them; it should show only the login form on a bare page). Kill the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move public Navbar/Footer into a (site) route group, stop admin routes inheriting public chrome"
```

---

### Task 4: Sidebar navigation shell

**Files:**
- Modify: `package.json` (add `lucide-react` dependency)
- Create: `components/admin/Sidebar.tsx`
- Modify: `app/admin/dashboard/layout.tsx`

**Interfaces:**
- Produces: default export `Sidebar` from `@/components/admin/Sidebar`, props `{ userEmail: string }`.

- [ ] **Step 1: Install `lucide-react`**

```bash
npm install lucide-react
```

- [ ] **Step 2: Create `components/admin/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Building2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Control Panel", icon: LayoutDashboard },
  { href: "/admin/dashboard/properties", label: "Properties", icon: Building2 },
  { href: "/admin/dashboard/leads", label: "Leads", icon: Users },
  { href: "/admin/dashboard/users", label: "Users", icon: UserCheck },
  { href: "/admin/dashboard/settings", label: "Configuration Settings", icon: Settings },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  function isActive(href: string): boolean {
    return href === "/admin/dashboard" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div>
        <div className="flex h-16 items-center border-b border-[var(--color-border)] px-6">
          <span className="text-lg font-bold tracking-tight text-[var(--color-ink)]">Chronos Admin</span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-bone)] text-[var(--color-ink)]"
                    : "text-[var(--color-ink-secondary)] hover:bg-[var(--color-bone)] hover:text-[var(--color-ink)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-[var(--color-border)] p-4">
        <p className="truncate px-3 pb-1 text-xs text-[var(--color-ink-secondary)]">{userEmail}</p>
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-ink-secondary)] transition-colors hover:bg-[var(--color-bone)] hover:text-[var(--color-ink)]"
        >
          <ExternalLink className="h-4 w-4" />
          Volver al sitio
        </Link>
        <button
          onClick={() => {
            setSignOutError(null);
            signOut(getFirebaseAuth()).catch(() => setSignOutError("Could not sign out. Try again."));
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-accent-red-text)] transition-colors hover:bg-[var(--color-accent-red-bg)]"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        {signOutError && <p className="px-3 text-xs text-[var(--color-accent-red-text)]">{signOutError}</p>}
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Replace `app/admin/dashboard/layout.tsx`**

```tsx
"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import { getFirebaseAuth } from "@/lib/firebase";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (currentUser) => {
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
    <div className="flex min-h-screen">
      <Sidebar userEmail={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
    </div>
  );
}
```

The auth-guard logic (`onAuthStateChanged`, `checking`/`user` state, redirect-to-login) is unchanged from the existing file — only the rendered chrome changes, from a simple bordered header to the `Sidebar` + main content layout. The sign-out button and "who's signed in" display both moved into `Sidebar`, but the underlying `getFirebaseAuth()`/`signOut()` call is identical to what was there before.

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. (`/admin/dashboard` itself still has no `page.tsx` at this point in the plan — that's Task 5 — so this route will 404 until then; that's expected, same "deliberately mid-migration" pattern used in earlier plans in this repo.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/admin/Sidebar.tsx app/admin/dashboard/layout.tsx
git commit -m "feat: add Sidebar navigation shell for the admin dashboard"
```

---

### Task 5: Control Panel

**Files:**
- Create: `app/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getAllProperties` (`@/lib/properties`); `getAllLeads`, `calculateResponseRate`, `countNewLeadsSince` (`@/lib/leads`).

- [ ] **Step 1: Create `app/admin/dashboard/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { getAllProperties } from "@/lib/properties";
import { calculateResponseRate, countNewLeadsSince, getAllLeads } from "@/lib/leads";
import type { Lead, Property } from "@/lib/types";

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface Activity {
  id: string;
  description: string;
  timestamp: number;
}

export default function ControlPanelPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllProperties(), getAllLeads()])
      .then(([propertiesResult, leadsResult]) => {
        if (cancelled) return;
        setProperties(propertiesResult);
        setLeads(leadsResult);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load dashboard data. Check your connection and try again.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-secondary)]">Loading…</p>;
  }

  if (error) {
    return <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>;
  }

  const featuredCount = properties.filter((property) => property.featured).length;
  const newLeadsThisWeek = countNewLeadsSince(leads, Date.now() - ONE_WEEK_MS);
  const responseRate = calculateResponseRate(leads);

  const activity: Activity[] = [
    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      description: `New lead: ${lead.name} inquired about ${lead.propertyTitle}`,
      timestamp: lead.createdAt,
    })),
    ...properties.map((property) => ({
      id: `property-${property.id}`,
      description: `Property added: ${property.title}`,
      timestamp: property.createdAt,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Control Panel</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Active Listings</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{properties.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Featured Listings</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{featuredCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Total Leads</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{leads.length}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-secondary)]">{newLeadsThisWeek} new this week</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Response Rate</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{responseRate}%</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold tracking-tight text-[var(--color-ink)]">Recent activity</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-secondary)]">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {activity.map((item) => (
              <li key={item.id} className="px-5 py-3 text-sm text-[var(--color-ink)]">
                {item.description}
                <span className="ml-2 text-xs text-[var(--color-ink-secondary)]">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. `/admin/dashboard` now has a `page.tsx`, closing the pre-existing 404 gap.

- [ ] **Step 3: Commit**

```bash
git add app/admin/dashboard/page.tsx
git commit -m "feat: add Control Panel with real KPIs and activity feed"
```

---

### Task 6: Leads — public capture and admin management

**Files:**
- Create: `components/InquiryForm.tsx`
- Modify: `app/(site)/properties/[id]/page.tsx`
- Create: `app/admin/dashboard/leads/page.tsx`

**Interfaces:**
- Consumes: `createLead` (`@/lib/leads`, Task 2) in `InquiryForm`; `subscribeToLeads`, `updateLeadStatus` (`@/lib/leads`) in the admin Leads page.
- Produces: default export `InquiryForm` from `@/components/InquiryForm`, props `{ propertyId: string; propertyTitle: string }`.

- [ ] **Step 1: Create `components/InquiryForm.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { createLead } from "@/lib/leads";

export default function InquiryForm({
  propertyId,
  propertyTitle,
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createLead({
        propertyId,
        propertyTitle,
        name,
        email,
        phone,
        message,
        status: "new",
      });
      setSubmitted(true);
    } catch {
      setError("Could not send your inquiry. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="mt-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-ink)]">
        Thanks — we&apos;ve received your inquiry and will be in touch soon.
      </p>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-10 inline-flex items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
      >
        Inquire about this property
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Name
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Phone (optional)
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Message (optional)
        <textarea
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      {error && <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Replace the `mailto:` CTA in `app/(site)/properties/[id]/page.tsx`**

The file (at its new post-Task-3 path) currently ends its right-hand column with:

```tsx
          <a
            href={`mailto:inquiries@chronos.example?subject=${encodeURIComponent(`Inquiry: ${property.title}`)}`}
            className="mt-10 inline-flex items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
          >
            Inquire about this property
          </a>
```

Replace that `<a>` block with:

```tsx
          <InquiryForm propertyId={property.id} propertyTitle={property.title} />
```

And add the import at the top of the file, alongside the existing `PropertyGallery` import:

```tsx
import InquiryForm from "@/components/InquiryForm";
```

Everything else in the file (back link, price, specs `dl`, description, `PropertyGallery`) is unchanged.

- [ ] **Step 3: Create `app/admin/dashboard/leads/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { subscribeToLeads, updateLeadStatus } from "@/lib/leads";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "closed"];
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLeads(
      (next) => {
        setLeads(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Could not load leads. Check your connection and try again.");
      }
    );
    return () => unsubscribe();
  }, []);

  async function handleStatusChange(id: string, status: LeadStatus) {
    try {
      await updateLeadStatus(id, status);
    } catch {
      window.alert("Could not update lead status. Try again.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Leads</h1>

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading leads…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">No leads yet.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Property</th>
                <th className="py-3 pr-4 font-medium">Contact</th>
                <th className="py-3 pr-4 font-medium">Message</th>
                <th className="py-3 pr-4 font-medium">Submitted</th>
                <th className="py-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-[var(--color-border)] align-top text-[var(--color-ink)]">
                  <td className="py-3 pr-4">{lead.propertyTitle}</td>
                  <td className="py-3 pr-4">
                    <p>{lead.name}</p>
                    <p className="text-xs text-[var(--color-ink-secondary)]">{lead.email}</p>
                    {lead.phone && <p className="text-xs text-[var(--color-ink-secondary)]">{lead.phone}</p>}
                  </td>
                  <td className="max-w-xs py-3 pr-4 text-[var(--color-ink-secondary)]">{lead.message || "—"}</td>
                  <td className="py-3 pr-4 text-[var(--color-ink-secondary)]">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={lead.status}
                      onChange={(event) => handleStatusChange(lead.id, event.target.value as LeadStatus)}
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
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

- [ ] **Step 4: Verify types, lint, and tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run`
Expected: all clean.

- [ ] **Step 5: Browser-driven verification**

Navigate to any `/properties/<id>` detail page. Click "Inquire about this property" — confirm the form expands inline (no navigation, no modal). Submit it (real write against the live project) — confirm it's replaced by the confirmation message. Then sign in as admin and check `/admin/dashboard/leads` — confirm the new lead appears, and that changing its status dropdown persists (reload the page, status should stick).

- [ ] **Step 6: Commit**

```bash
git add components/InquiryForm.tsx "app/(site)/properties/[id]/page.tsx" app/admin/dashboard/leads/page.tsx
git commit -m "feat: add public inquiry form and admin leads management"
```

---

### Task 7: Users page

**Files:**
- Create: `app/admin/dashboard/users/page.tsx`

**Interfaces:**
- Consumes: `subscribeToAdmins`, `addAdmin`, `removeAdmin` (`@/lib/admins`, Task 2); `getFirebaseAuth` (`@/lib/firebase`).

- [ ] **Step 1: Create `app/admin/dashboard/users/page.tsx`**

```tsx
"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState, type FormEvent } from "react";
import { addAdmin, removeAdmin, subscribeToAdmins } from "@/lib/admins";
import { getFirebaseAuth } from "@/lib/firebase";
import type { AdminEntry } from "@/lib/types";

export default function UsersPage() {
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUid, setNewUid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), (user) => setCurrentUser(user));
    const unsubscribeAdmins = subscribeToAdmins(
      (next) => {
        setAdmins(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Could not load admins. Check your connection and try again.");
      }
    );
    return () => {
      unsubscribeAuth();
      unsubscribeAdmins();
    };
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!currentUser) return;
    const uid = newUid.trim();
    if (!uid) return;
    setSubmitting(true);
    try {
      await addAdmin(uid, currentUser.uid);
      setNewUid("");
    } catch {
      setFormError("Could not add this admin. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(uid: string) {
    if (!window.confirm("Remove this admin's access? This cannot be undone.")) return;
    try {
      await removeAdmin(uid);
    } catch {
      window.alert("Could not remove this admin. Try again.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Users</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">
        Manage who can access this dashboard. Accounts themselves are still created manually in the Firebase
        Console — this only controls admin access for an existing account.
      </p>

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Add admin by UID
          <input
            required
            value={newUid}
            onChange={(event) => setNewUid(event.target.value)}
            placeholder="Firebase Auth UID"
            className="w-72 rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add admin"}
        </button>
      </form>
      {formError && <p className="mt-2 text-sm text-[var(--color-accent-red-text)]">{formError}</p>}

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading admins…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">No admins found.</p>
        ) : (
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">UID</th>
                <th className="py-3 pr-4 font-medium">Added by</th>
                <th className="py-3 pr-4 font-medium">Added</th>
                <th className="py-3 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.uid} className="border-b border-[var(--color-border)] text-[var(--color-ink)]">
                  <td className="py-3 pr-4 font-mono text-xs">{admin.uid}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-[var(--color-ink-secondary)]">
                    {admin.addedBy || "—"}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-ink-secondary)]">
                    {new Date(admin.addedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    {currentUser?.uid === admin.uid ? (
                      <span className="text-xs text-[var(--color-ink-secondary)]">(you)</span>
                    ) : (
                      <button
                        onClick={() => handleRemove(admin.uid)}
                        className="text-[var(--color-accent-red-text)] hover:underline"
                      >
                        Remove
                      </button>
                    )}
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

The Remove button is replaced with `(you)` text (no button at all) for the currently-signed-in admin's own row — this is the self-lockout guard from the design, enforced by simply never rendering a way to trigger it, not just disabling a button.

- [ ] **Step 2: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 3: Browser-driven verification**

Sign in as admin, navigate to `/admin/dashboard/users`. Confirm your own account appears with `(you)` instead of a Remove button. Add a second UID (any string — Firestore doesn't validate it corresponds to a real account, by design per the approved trade-off), confirm it appears in the list with your UID as `addedBy` and today's date. Remove it, confirm it disappears.

- [ ] **Step 4: Commit**

```bash
git add app/admin/dashboard/users/page.tsx
git commit -m "feat: add Users page for self-service admin allowlist management"
```

---

### Task 8: Configuration Settings page

**Files:**
- Create: `components/admin/LogoUpload.tsx`
- Create: `app/admin/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `isAllowedImageFile` (`@/lib/property-utils`); `uploadSiteLogo` (`@/lib/storage`, Task 2) in `LogoUpload`; `getSiteSettings`, `updateSiteSettings` (`@/lib/settings`, Task 2) in the Settings page.
- Produces: default export `LogoUpload` from `@/components/admin/LogoUpload`, props `{ value: string; onChange: (url: string) => void }`.

- [ ] **Step 1: Create `components/admin/LogoUpload.tsx`**

A single-image sibling of `ImageGalleryUpload` (from the property-image-gallery plan) — same validation/error-handling shape, simpler because there's exactly one image, not a reorderable gallery:

```tsx
"use client";

import { useRef, useState } from "react";
import { isAllowedImageFile } from "@/lib/property-utils";
import { uploadSiteLogo } from "@/lib/storage";

export default function LogoUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);

    if (!isAllowedImageFile(file)) {
      setError("Please choose a JPEG, PNG, or WebP image up to 5MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const url = await uploadSiteLogo(file);
      onChange(url);
    } catch (err) {
      console.error("Logo upload failed:", err);
      setError("Could not upload the logo. Check your connection and try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Logo
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => handleFileSelected(event.target.files)}
          disabled={uploading}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      {uploading && <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">Uploading…</p>}
      {error && <p className="mt-2 text-sm text-[var(--color-accent-red-text)]">{error}</p>}
      {value && !uploading && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Current logo"
          className="mt-3 h-16 w-16 rounded-md border border-[var(--color-border)] object-cover"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `app/admin/dashboard/settings/page.tsx`**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import LogoUpload from "@/components/admin/LogoUpload";
import { getSiteSettings, updateSiteSettings } from "@/lib/settings";
import type { SiteSettings } from "@/lib/types";

const EMPTY_SETTINGS: SiteSettings = {
  logoUrl: "",
  businessName: "",
  address: "",
  phone: "",
  whatsappNumber: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSiteSettings()
      .then((result) => {
        if (cancelled) return;
        if (result) setSettings(result);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load settings. Check your connection and try again.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateSiteSettings(settings);
      setSaved(true);
    } catch {
      setError("Could not save settings. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-secondary)]">Loading…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Configuration Settings</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex max-w-lg flex-col gap-4">
        <LogoUpload value={settings.logoUrl} onChange={(url) => update("logoUrl", url)} />

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Business name
          <input
            value={settings.businessName}
            onChange={(event) => update("businessName", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Address
          <input
            value={settings.address}
            onChange={(event) => update("address", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Phone
          <input
            value={settings.phone}
            onChange={(event) => update("phone", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          WhatsApp number
          <input
            value={settings.whatsappNumber}
            onChange={(event) => update("whatsappNumber", event.target.value)}
            className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>

        {error && <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>}
        {saved && <p className="text-sm text-[var(--color-accent-teal)]">Settings saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Browser-driven verification**

Sign in as admin, navigate to `/admin/dashboard/settings`. Fill in the text fields and upload a logo image, click Save — confirm "Settings saved." appears. Reload the page — confirm all values (including the logo preview) persist. Try uploading a non-image file — confirm the inline error appears and nothing uploads.

- [ ] **Step 5: Commit**

```bash
git add components/admin/LogoUpload.tsx app/admin/dashboard/settings/page.tsx
git commit -m "feat: add Configuration Settings page with logo upload"
```

---

### Task 9: README update and full verification

**Files:**
- Modify: `README.md`

**Interfaces:** none (documentation + verification only).

- [ ] **Step 1: Add a note about self-service admin management to the README**

In the "Authorize that admin" step, append this sentence to the existing paragraph:

```markdown
   Once at least one admin exists, additional admins can be added directly from the dashboard's Users page (`/admin/dashboard/users`) instead of repeating this step manually.
```

No new deploy command is needed — the existing `firebase deploy --only firestore:rules,storage` step already deploys the full contents of both rules files, including this plan's `leads`/`settings`/`admins` changes (already deployed once in Task 1, but the command documented for future readers is unchanged).

- [ ] **Step 2: Full static verification**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```

Expected: all four pass. `npm run build` in particular confirms the Task 3 route-group refactor didn't change the static/dynamic split for any existing route, and that the 4 new admin pages build correctly.

- [ ] **Step 3: Full manual smoke test against the live Firebase project**

Walk the entire shell end-to-end, signed in as admin:

1. `/admin/dashboard` — Control Panel loads with real KPI numbers (should reflect actual property/lead counts from earlier tasks' testing) and an activity feed showing recent leads/properties
2. Click each of the 5 sidebar nav items — confirm active-link highlighting follows correctly, confirm "Volver al sitio" opens `/` in a new tab, confirm the signed-in email displays at the bottom
3. Sign out via the sidebar button — confirm redirect to `/admin/login`
4. Visit `/admin/login` and any public page (`/`, `/properties`) — confirm public pages still show the Navbar/Footer and the login page doesn't (Task 3's fix holding)

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: note self-service admin management in README"
```
