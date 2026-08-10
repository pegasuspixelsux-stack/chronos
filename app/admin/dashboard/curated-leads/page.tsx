"use client";

import { useEffect, useMemo, useState } from "react";
import { subscribeToQualifiedLeads, updateQualifiedLeadStatus } from "@/lib/qualified-leads";
import type { LeadStatus, LeadTemperature, QualifiedLead } from "@/lib/types";

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "closed"];
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

type TemperatureFilter = "all" | LeadTemperature;

const TEMPERATURE_FILTERS: { value: TemperatureFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
];

function TemperatureBadge({ temperature }: { temperature: LeadTemperature }) {
  const isHot = temperature === "hot";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isHot ? "bg-[var(--color-accent-red-bg)] text-[var(--color-accent-red-text)]" : "bg-black/5 text-[var(--color-ink-secondary)]"
      }`}
    >
      {isHot ? "Hot" : "Warm"}
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
        setError("Could not load curated leads. Check your connection and try again.");
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
      window.alert("Could not update lead status. Try again.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Curated Selection Leads</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-secondary)]">
        Submissions from the &ldquo;Recibir mi selección curada&rdquo; questionnaire, scored client-side into hot
        and warm leads. {hotCount > 0 && `${hotCount} hot lead${hotCount === 1 ? "" : "s"} waiting.`}
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
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading curated leads…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : filteredLeads.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">No curated leads yet.</p>
        ) : (
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Contact</th>
                <th className="py-3 pr-4 font-medium">Temp / Score</th>
                <th className="py-3 pr-4 font-medium">Timeframe</th>
                <th className="py-3 pr-4 font-medium">Budget</th>
                <th className="py-3 pr-4 font-medium">Usage</th>
                <th className="py-3 pr-4 font-medium">Areas</th>
                <th className="py-3 pr-4 font-medium">Size</th>
                <th className="py-3 pr-4 font-medium">Source</th>
                <th className="py-3 pr-4 font-medium">Submitted</th>
                <th className="py-3 pr-4 font-medium">Status</th>
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
