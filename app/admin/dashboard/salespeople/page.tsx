"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createSalesperson, deleteSalesperson, subscribeToSalespeople, updateSalesperson } from "@/lib/salespeople";
import type { Salesperson } from "@/lib/types";

export default function SalespeoplePage() {
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSalespeople(
      (next) => {
        setSalespeople(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("No se pudieron cargar los asesores. Verificá tu conexión e intentá de nuevo.");
      }
    );
    return () => unsubscribe();
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const name = newName.trim();
    if (!name) return;
    setSubmitting(true);
    try {
      await createSalesperson({ name, active: true });
      setNewName("");
    } catch {
      setFormError("No se pudo agregar el asesor. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(person: Salesperson) {
    try {
      await updateSalesperson(person.id, { name: person.name, active: !person.active });
    } catch {
      window.alert("No se pudo actualizar el asesor. Intentá de nuevo.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("¿Eliminar este asesor? Esta acción no se puede deshacer.")) return;
    try {
      await deleteSalesperson(id);
    } catch {
      window.alert("No se pudo eliminar el asesor. Intentá de nuevo.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Asesores</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">
        Gestioná la lista de asesores que los clientes pueden elegir en el modal &ldquo;Consulte un
        asesor&rdquo;. Solo los asesores activos aparecen en el selector.
      </p>

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
          Nombre del asesor
          <input
            required
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            className="w-72 rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--color-accent-teal)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
        >
          {submitting ? "Agregando…" : "Agregar asesor"}
        </button>
      </form>
      {formError && <p className="mt-2 text-sm text-[var(--color-accent-red-text)]">{formError}</p>}

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Cargando asesores…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : salespeople.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Todavía no hay asesores.</p>
        ) : (
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Nombre</th>
                <th className="py-3 pr-4 font-medium">Estado</th>
                <th className="py-3 pr-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salespeople.map((person) => (
                <tr key={person.id} className="border-b border-[var(--color-border)] text-[var(--color-ink)]">
                  <td className="py-3 pr-4">{person.name}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        person.active
                          ? "bg-[var(--color-accent-teal)]/10 text-[var(--color-accent-teal)]"
                          : "bg-black/5 text-[var(--color-ink-secondary)]"
                      }`}
                    >
                      {person.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => handleToggleActive(person)}
                      className="mr-3 text-[var(--color-accent-teal)] hover:underline"
                    >
                      {person.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="text-[var(--color-accent-red-text)] hover:underline"
                    >
                      Eliminar
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
