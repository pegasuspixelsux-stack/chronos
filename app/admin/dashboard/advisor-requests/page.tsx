"use client";

import { useEffect, useState } from "react";
import { subscribeToAdvisorRequests, updateAdvisorRequestStatus } from "@/lib/advisor-requests";
import type { AdvisorRequest, LeadStatus } from "@/lib/types";

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "closed"];
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  closed: "Cerrado",
};

export default function AdvisorRequestsPage() {
  const [requests, setRequests] = useState<AdvisorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAdvisorRequests(
      (next) => {
        setRequests(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("No se pudieron cargar las solicitudes. Verificá tu conexión e intentá de nuevo.");
      }
    );
    return () => unsubscribe();
  }, []);

  async function handleStatusChange(id: string, status: LeadStatus) {
    try {
      await updateAdvisorRequestStatus(id, status);
    } catch {
      window.alert("No se pudo actualizar el estado. Intentá de nuevo.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Solicitudes de Asesor</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-secondary)]">
        Solicitudes enviadas desde el modal &ldquo;Consulte un asesor&rdquo; en el sitio público.
      </p>

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Cargando solicitudes…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Todavía no hay solicitudes.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Propiedad</th>
                <th className="py-3 pr-4 font-medium">Contacto</th>
                <th className="py-3 pr-4 font-medium">Asesor elegido</th>
                <th className="py-3 pr-4 font-medium">Fecha</th>
                <th className="py-3 pr-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-[var(--color-border)] align-top text-[var(--color-ink)]"
                >
                  <td className="py-3 pr-4">{request.propertyTitle}</td>
                  <td className="py-3 pr-4">
                    <p>{request.name}</p>
                    <p className="text-xs text-[var(--color-ink-secondary)]">{request.whatsapp}</p>
                  </td>
                  <td className="py-3 pr-4">{request.salespersonName}</td>
                  <td className="py-3 pr-4 text-[var(--color-ink-secondary)]">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={request.status}
                      onChange={(event) => handleStatusChange(request.id, event.target.value as LeadStatus)}
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
