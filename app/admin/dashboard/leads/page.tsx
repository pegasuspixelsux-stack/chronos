"use client";

import { useEffect, useState } from "react";
import { subscribeToLeads, updateLeadStatus } from "@/lib/leads";
import type { Lead, LeadStatus } from "@/lib/types";

const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "closed"];
const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  closed: "Closed",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLeads(
      (next) => {
        setLeads(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setLoading(false);
        setError("Could not load leads. Check your connection and try again.");
      }
    );
    return () => unsubscribe();
  }, []);

  async function handleStatusChange(id: string, status: LeadStatus) {
    try {
      await updateLeadStatus(id, status);
    } catch {
      window.alert("Could not update lead status. Try again.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-ink)]">Leads</h1>

      <div className="mt-8 overflow-x-auto">
        {loading ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">Loading leads…</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-secondary)]">No leads yet.</p>
        ) : (
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-ink-secondary)]">
                <th className="py-3 pr-4 font-medium">Property</th>
                <th className="py-3 pr-4 font-medium">Contact</th>
                <th className="py-3 pr-4 font-medium">Message</th>
                <th className="py-3 pr-4 font-medium">Submitted</th>
                <th className="py-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-[var(--color-border)] align-top text-[var(--color-ink)]">
                  <td className="py-3 pr-4">{lead.propertyTitle}</td>
                  <td className="py-3 pr-4">
                    <p>{lead.name}</p>
                    <p className="text-xs text-[var(--color-ink-secondary)]">{lead.email}</p>
                    {lead.phone && <p className="text-xs text-[var(--color-ink-secondary)]">{lead.phone}</p>}
                  </td>
                  <td className="max-w-xs py-3 pr-4 text-[var(--color-ink-secondary)]">{lead.message || "—"}</td>
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
