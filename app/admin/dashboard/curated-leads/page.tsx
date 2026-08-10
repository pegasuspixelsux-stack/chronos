"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToQualifiedLeads, updateQualifiedLeadStatus } from "@/lib/qualified-leads";
import type { LeadStatus, LeadTemperature, QualifiedLead } from "@/lib/types";

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "closed"];
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  closed: "Cerrado",
};

type TemperatureFilter = "all" | LeadTemperature;

const TEMPERATURE_FILTERS: { value: TemperatureFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "hot", label: "Caliente" },
  { value: "warm", label: "Tibio" },
];

function TemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  const isHot = temperature === "hot";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isHot ? "bg-[var(--color-accent-red-bg)] text-[var(--color-accent-red-text)]" : "bg-black/5 text-[var(--color-ink-secondary)]"
      }`}
    >
      {isHot ? "Caliente" : "Tibio"}
    </span>
  );
}

export default function CuratedLeadsPage() {
  const [leads, setLeads] = useState<QualifiedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [temperatureFilter, setTemperatureFilter] = useState<TemperatureFilter>("all");

  useEffect(() => {
    const unsubscribe = subscribeToQualifiedLeads(
      (next) => {
        setLeads(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("No se pudieron cargar los leads curados. Verificá tu conexión e intentá de nuevo.");
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredLeads = useMemo(
    () => (temperatureFilter === "all" ? leads : leads.filter((lead) => lead.leadTemperature === temperatureFilter)),
    [leads, temperatureFilter]
  );

  const hotCount = useMemo(() => leads.filter((lead) => lead.leadTemperature === "hot").length, [leads]);

  async function handleStatusChange(id: string, status: LeadStatus) {
    try {
      await updateQualifiedLeadStatus(id, status);
    } catch {
      window.alert("No se pudo actualizar el estado del lead. Intentá de nuevo.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Leads de Selección Curada</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-secondary)]">
        Respuestas del cuestionario &ldquo;Solicitar mi selección curada&rdquo;, clasificadas automáticamente en
        leads calientes y tibios. {hotCount > 0 && `${hotCount} lead${hotCount === 1 ? "" : "s"} caliente${hotCount === 1 ? "" : "s"} esperando.`}
      </p>

      <div className="mt-6 flex gap-2">
        {TEMPERATURE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setTemperatureFilter(filter.value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              temperatureFilter === filter.value
                ? "border-[var(--color-accent-teal)] bg-[var(--color-accent-teal)] text-white"
                : "border-[var(--color-border)] text-[var(--color-ink-secondary)] hover:border-[var(--color-accent-teal)]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Cargando leads curados…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : filteredLeads.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Todavía no hay leads curados.</p>
        ) : (
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Contacto</th>
                <th className="py-3 pr-4 font-medium">Temp / Puntaje</th>
                <th className="py-3 pr-4 font-medium">Plazo</th>
                <th className="py-3 pr-4 font-medium">Presupuesto</th>
                <th className="py-3 pr-4 font-medium">Uso</th>
                <th className="py-3 pr-4 font-medium">Zonas</th>
                <th className="py-3 pr-4 font-medium">Tamaño</th>
                <th className="py-3 pr-4 font-medium">Origen</th>
                <th className="py-3 pr-4 font-medium">Fecha</th>
                <th className="py-3 pr-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="border-b border-[var(--color-border)] align-top text-[var(--color-ink)]">
                  <td className="py-3 pr-4">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-[var(--color-ink-secondary)]">{lead.email}</p>
                    <p className="text-xs text-[var(--color-ink-secondary)]">{lead.phone}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <TemperatureBadge temperature={lead.leadTemperature} />
                    <p className="mt-1 text-xs text-[var(--color-ink-secondary)]">{lead.readinessScore}/95</p>
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-ink-secondary)]">{lead.timeframe}</td>
                  <td className="py-3 pr-4 text-[var(--color-ink-secondary)]">{lead.budgetRange}</td>
                  <td className="py-3 pr-4 text-[var(--color-ink-secondary)]">{lead.propertyUsage}</td>
                  <td className="max-w-[200px] py-3 pr-4 text-[var(--color-ink-secondary)]">
                    {lead.preferredAreas.join(", ") || "—"}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-ink-secondary)]">{lead.propertySize}</td>
                  <td className="py-3 pr-4 text-[var(--color-ink-secondary)]">{lead.acquisitionSource}</td>
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
