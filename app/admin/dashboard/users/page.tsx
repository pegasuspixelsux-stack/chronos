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
