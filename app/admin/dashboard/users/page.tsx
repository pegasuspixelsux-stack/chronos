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
  const [currentUser, setCurrentUser] = useState<User | null>(() => getFirebaseAuth().currentUser);
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
        setError("No se pudieron cargar los administradores. Verificá tu conexión e intentá de nuevo.");
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
      setFormError("No se pudo agregar el administrador. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(uid: string) {
    if (!window.confirm("¿Quitar el acceso de este administrador? Esta acción no se puede deshacer.")) return;
    try {
      await removeAdmin(uid);
    } catch {
      window.alert("No se pudo quitar el administrador. Intentá de nuevo.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Usuarios</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">
        Gestioná quién puede acceder a este panel. Las cuentas se siguen creando manualmente desde Firebase
        Console — esto solo controla el acceso de administrador para una cuenta existente.
      </p>

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Agregar administrador por UID
          <input
            required
            value={newUid}
            onChange={(event) => setNewUid(event.target.value)}
            placeholder="UID de Firebase Auth"
            className="w-72 rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
        >
          {submitting ? "Agregando…" : "Agregar administrador"}
        </button>
      </form>
      {formError && <p className="mt-2 text-sm text-[var(--color-accent-red-text)]">{formError}</p>}

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Cargando administradores…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">No se encontraron administradores.</p>
        ) : (
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">UID</th>
                <th className="py-3 pr-4 font-medium">Agregado por</th>
                <th className="py-3 pr-4 font-medium">Fecha</th>
                <th className="py-3 pr-4 font-medium">Acciones</th>
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
                    {admin.addedAt !== null ? new Date(admin.addedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {currentUser?.uid === admin.uid ? (
                      <span className="text-xs text-[var(--color-ink-secondary)]">(vos)</span>
                    ) : (
                      <button
                        onClick={() => handleRemove(admin.uid)}
                        className="text-[var(--color-accent-red-text)] hover:underline"
                      >
                        Quitar
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
