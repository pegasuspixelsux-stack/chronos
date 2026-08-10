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
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAllProperties(), getAllLeads()])
      .then(([propertiesResult, leadsResult]) => {
        if (cancelled) return;
        setProperties(propertiesResult);
        setLeads(leadsResult);
        setLoadedAt(Date.now());
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("No se pudieron cargar los datos del panel. Verificá tu conexión e intentá de nuevo.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-secondary)]">Cargando…</p>;
  }

  if (error) {
    return <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>;
  }

  const featuredCount = properties.filter((property) => property.featured).length;
  const newLeadsThisWeek = countNewLeadsSince(leads, loadedAt - ONE_WEEK_MS);
  const responseRate = calculateResponseRate(leads);

  const activity: Activity[] = [
    ...leads.map((lead) => ({
      id: `lead-${lead.id}`,
      description: `Nuevo lead: ${lead.name} consultó por ${lead.propertyTitle}`,
      timestamp: lead.createdAt,
    })),
    ...properties.map((property) => ({
      id: `property-${property.id}`,
      description: `Propiedad agregada: ${property.title}`,
      timestamp: property.createdAt,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Panel de Control</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Propiedades Activas</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{properties.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Propiedades Destacadas</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{featuredCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Leads Totales</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{leads.length}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-secondary)]">{newLeadsThisWeek} nuevos esta semana</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink-secondary)]">Tasa de Respuesta</p>
          <p className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{responseRate}%</p>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold tracking-tight text-[var(--color-ink)]">Actividad reciente</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-ink-secondary)]">Todavía no hay actividad.</p>
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
