# Admin Dashboard Shell — Design

## Goal

Build a persistent sidebar-navigation admin shell for Chronos with five sections — Control Panel, Properties, Leads, Users, Configuration Settings — replacing the current bare admin layout. Every number and feature in this design is real and backed by actual data; nothing fakes a business capability Chronos doesn't have.

## Context: why this deviates from the originally pasted snippet

The initial request included a code snippet (`app/dashboard/layout.tsx`, titled "Oikos Admin") that conflicts with the actual Chronos codebase in several ways, resolved through clarifying questions:

- **KPIs.** The snippet's "Monthly Revenue," "Occupancy Rates," and "Lead Conversion Rate" are property-*management*/rental metrics. Chronos is a for-sale listings site with no revenue, occupancy, or sales-outcome tracking. Decision: build only KPIs that map to real Chronos data (§4), and build a real Leads feature (§5) so lead-related metrics are genuine rather than invented.
- **Branding & routing.** The snippet uses `/dashboard/*` routes and "Oikos Admin" branding — likely copied from a different one of the user's Firebase projects (`oikosv2-admin` exists in the same account). Decision: keep the existing `/admin/dashboard/*` route tree, its already-wired auth guard, and "Chronos" branding. No URL or identity disruption.
- **Icons.** The snippet uses `lucide-react`, not currently installed; the rest of the app hand-rolls inline SVG icons. Decision: add `lucide-react` as a new dependency — reasonable for a dashboard needing 7+ icons, avoids repetitive SVG authorship.
- **"Users."** Chronos has no public user-account system. Decision: "Users" means managing the existing `admins` Firestore allowlist collection (who can access `/admin/*`), not a customer-account system.
- **"Configuration Settings."** Undefined in the original request. Decision: site contact info — logo, business name, address, phone, WhatsApp number — stored in Firestore, editable in-app. Not yet wired to any automated behavior (no email sending, no public display) — foundation for future use, not a functioning notification system.

## 1. Firestore schema & rules

**New collections/docs:**

```ts
type LeadStatus = "new" | "contacted" | "closed";

interface Lead {
  id: string;
  propertyId: string;
  propertyTitle: string; // denormalized, avoids an extra read per lead row
  name: string;
  email: string;
  phone: string;
  message: string;
  status: LeadStatus;
  createdAt: number;
}

type LeadInput = Omit<Lead, "id" | "createdAt">;

interface SiteSettings {
  logoUrl: string;
  businessName: string;
  address: string;
  phone: string;
  whatsappNumber: string;
}

interface AdminEntry {
  uid: string;
  addedBy: string;
  addedAt: number;
}
```

- `leads/{leadId}` — one document per inquiry submission.
- `settings/site` — single fixed-path document (not a collection of many settings docs).
- `admins/{uid}` (existing collection) — each doc gains `addedBy` and `addedAt` fields (audit trail for the newly-writable collection, see below).

**`firestore.rules` changes:**

```
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
```

**Security note, made explicit and accepted:** `admins/{adminId}` moves from `allow read, write: if false` (Console/CLI only) to `allow read, write: if isAdmin()`, so any signed-in admin can grant admin access to any UID they type, with no verification the UID corresponds to a real account. This is a deliberate, explicitly-approved trade-off for self-service admin management. Mitigations: `addedBy`/`addedAt` audit fields on every admin doc, and the Users page UI blocks an admin from removing their own access (lockout prevention, not a security boundary).

**`storage.rules` addition** — a new `match /site/{fileName}` block, identical shape to the existing `property-images` block (admin-only write, public read, 5MB size cap, image-type content-type check), covering the logo upload.

## 2. Data layer (`lib/`)

New files, following the established `lib/properties.ts` pattern (thin Firestore wrappers, one file per domain concern):

- **`lib/leads.ts`**: `createLead(input: LeadInput): Promise<string>`, `subscribeToLeads(onData: (leads: Lead[]) => void, onError?: (error: FirestoreError) => void): Unsubscribe`, `updateLeadStatus(id: string, status: LeadStatus): Promise<void>`. No delete function — not requested, not needed (YAGNI).
- **`lib/admins.ts`**: `subscribeToAdmins(onData: (admins: AdminEntry[]) => void, onError?: (error: FirestoreError) => void): Unsubscribe`, `addAdmin(uid: string, addedByUid: string): Promise<void>`, `removeAdmin(uid: string): Promise<void>`.
- **`lib/settings.ts`**: `getSiteSettings(): Promise<SiteSettings | null>`, `updateSiteSettings(input: SiteSettings): Promise<void>` — writes via `setDoc` with merge to the fixed `settings/site` path, not `addDoc` (there is exactly one settings document).
- **`lib/storage.ts`** gains `uploadSiteLogo(file: File): Promise<string>` — same shape as the existing `uploadPropertyImage`, but a fixed path (`site/logo`, no UUID) so each upload overwrites the previous logo rather than accumulating orphaned files in Storage.
- **`lib/types.ts`** gains `LeadStatus`, `Lead`, `LeadInput`, `SiteSettings`, `AdminEntry` (shapes above).

## 3. Sidebar navigation shell

`app/admin/dashboard/layout.tsx` keeps its current responsibility unchanged — the `onAuthStateChanged` guard and redirect-to-login logic. Its rendered chrome is restructured to compose a new `components/admin/Sidebar.tsx` (client component; needs `usePathname()` for active-link highlighting) alongside `{children}`, rather than the current simple bordered-header layout.

**Nav items, in order, all under the existing `/admin/dashboard` prefix:**

1. Control Panel → `/admin/dashboard`
2. Properties → `/admin/dashboard/properties`
3. Leads → `/admin/dashboard/leads`
4. Users → `/admin/dashboard/users`
5. Configuration Settings → `/admin/dashboard/settings`

**Bottom of sidebar:** "Volver al sitio" (link to `/`, new tab) and "Sign Out" — the sign-out button reuses the `getFirebaseAuth()`/`signOut()` call already present in `layout.tsx`, not a duplicate implementation.

**Icons:** `lucide-react` (new dependency) — `LayoutDashboard`, `Building2`, `Users`, `UserCheck`, `Settings`, `ExternalLink`, `LogOut`.

**Visual styling:** Chronos's existing design tokens (`--color-accent-teal`, `--color-ink`, `--color-surface`, `--color-border`, etc.), not the snippet's plain gray Tailwind palette — consistent with every other admin page already built.

**Incidental fix:** `/admin/dashboard` currently has no `page.tsx` and 404s (a gap flagged in an earlier code review of this codebase). This design closes it — the Control Panel becomes that route's page.

## 4. Control Panel (`/admin/dashboard`)

Client component. Fetches data once on mount (same pattern as the property form's slider-count fetch elsewhere in this app) — not a realtime `onSnapshot` subscription, since KPIs don't need millisecond freshness.

**KPI grid — 4 cards, all real:**

1. **Active Listings** — total property count (`properties.length`).
2. **Featured Listings** — count where `featured === true`.
3. **Total Leads** — count of all leads, with "N new this week" as a sub-metric.
4. **Response Rate** — percentage of leads not still in `"new"` status. Replaces the originally-requested "conversion rate," honestly scoped to what Chronos can actually measure (a lead being responded to, not a lead resulting in a sale — that outcome isn't tracked anywhere).

**Activity feed**, below the grid: merges recent leads and recently-created properties into one reverse-chronological list. Explicitly does **not** include "property updates" (no `updatedAt` field exists or is being added in this pass) or "system events" (nothing in this app's architecture produces any).

## 5. Leads: public capture + admin management

**Public side (`app/properties/[id]/page.tsx`):** the current `mailto:` "Inquire about this property" link is replaced by `components/InquiryForm.tsx`, a client component taking `propertyId: string` and `propertyTitle: string` as props (not the whole `Property` object — keeps the component's dependency surface minimal). Clicking reveals an inline form (name/email required, phone/message optional) — no modal/dialog, since this app has no such pattern anywhere yet. On submit: `createLead()`, then the form is replaced with a confirmation message (prevents double-submit, gives feedback).

**Admin side (`/admin/dashboard/leads`):** table of all leads (property, contact info, message, status, submitted date), newest first, via `subscribeToLeads` (live updates, matching the existing properties-dashboard pattern). Each row has a status dropdown (New / Contacted / Closed) wired to `updateLeadStatus`.

## 6. Users (`/admin/dashboard/users`)

Lists current admin entries (UID, `addedBy`, `addedAt`) via `subscribeToAdmins`. A small form adds a new admin by UID (`addAdmin(uid, currentUserUid)`). Each row has a Remove button (`removeAdmin`) — **disabled on the signed-in admin's own row**, preventing accidental self-lockout. No email lookup, no in-app account creation (both would require the Admin SDK, explicitly out of scope — account creation stays a manual Firebase Console step, per the existing README flow). This page only manages the `admins` allowlist itself.

## 7. Configuration Settings (`/admin/dashboard/settings`)

Form for `SiteSettings`: business name, address, phone, and WhatsApp number as plain text fields, plus a logo upload (single image, using `uploadSiteLogo` — a simpler single-file sibling of the property-gallery upload component, not the full multi-image `ImageGalleryUpload`). Fetches current settings via `getSiteSettings()` on mount, saves via `updateSiteSettings()`.

Explicitly scoped as **configuration storage only** in this pass: these values aren't yet consumed anywhere else in the app (no Footer display, no automated email/WhatsApp behavior). That wiring is a natural follow-up once this foundation exists, not part of this design.

## Non-goals (explicitly out of scope)

- Occupancy rates, monthly revenue, growth metrics, or any rental/property-management concept — Chronos has no such business model.
- True lead-to-sale conversion tracking (would require tracking property sale outcomes, which doesn't exist).
- Admin SDK / server-side routes of any kind — the Users page manages the `admins` collection directly from the client, consistent with the app's established "client SDK only" architecture.
- In-app Firebase Auth account creation — admin accounts are still created manually in the Firebase Console.
- "Property updates" or "system events" in the activity feed.
- Wiring `SiteSettings` values into any automated behavior (email notifications, public display, CTA links) — storage only, for now.
- Migrating the pasted snippet's `/dashboard/*` routing or "Oikos Admin" branding — this design keeps the existing `/admin/dashboard/*` tree and "Chronos" identity entirely.
