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
