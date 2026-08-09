# Chronos

A real estate listings platform built with Next.js and Firebase (client SDK only — no Admin SDK, no Cloud Functions).

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Firebase project**

   In the [Firebase console](https://console.firebase.google.com/), create a project and enable:
   - **Firestore** (Database)
   - **Authentication** → sign-in method → **Email/Password**

3. **Configure environment variables**

   Copy your Firebase web app config into `.env.local` at the project root — it already lists the 6 required keys:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   ```

4. **Deploy the Firestore security rules**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore   # select your project, keep the existing firestore.rules
   firebase deploy --only firestore:rules
   ```

   **The app has no real write protection until this rules deploy happens.** Until then, `firestore.rules` isn't enforced against your project at all.

5. **Create an admin user**

   In the Firebase console → **Authentication** → **Users**, add a user with an email and password. This is the account you'll use to sign in at `/admin/login`.

6. **Authorize that admin**

   Writes are restricted to UIDs listed in the `admins` collection. In the Firebase console → **Firestore**, manually create a document at `admins/{their UID}` (find the UID on the Authentication → Users page). The document's content doesn't matter — an empty document is fine.

   Without this step, the admin can log in at `/admin/login`, but every create/update/delete will be rejected by the security rules.

7. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), sign in at `/admin/login`, and add a property. Mark it **featured** to see it on the home page.

## Other commands

```bash
npx tsc --noEmit   # type check
npm run lint       # lint
npm run test       # unit tests (vitest)
npm run build      # production build
```
