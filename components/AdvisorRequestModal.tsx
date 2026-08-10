"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import type { Salesperson } from "@/lib/types";

export default function AdvisorRequestModal({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
}) {
  const headingId = useId();

  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  const [loadingSalespeople, setLoadingSalespeople] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [salespersonName, setSalespersonName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    import("@/lib/salespeople")
      .then(({ getActiveSalespeople }) => getActiveSalespeople())
      .then((result) => {
        if (cancelled) return;
        setSalespeople(result);
        setLoadError(null);
        setLoadingSalespeople(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("No pudimos cargar la lista de asesores. Verificá tu conexión e intentá de nuevo.");
        setLoadingSalespeople(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  function resetAndClose() {
    onClose();
    setTimeout(() => {
      setName("");
      setWhatsapp("");
      setSalespersonName("");
      setSubmitted(false);
      setError(null);
      setLoadingSalespeople(true);
      setSalespeople([]);
    }, 300);
  }

  const canSubmit = name.trim().length > 0 && whatsapp.trim().length > 0 && salespersonName !== "" && !submitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { createAdvisorRequest } = await import("@/lib/advisor-requests");
      await createAdvisorRequest({
        propertyId,
        propertyTitle,
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        salespersonName,
        status: "new",
      });
      setSubmitted(true);
    } catch {
      setError("No pudimos enviar tu solicitud. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={resetAndClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-[var(--color-surface)] p-6 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id={headingId} className="text-lg font-semibold text-[var(--color-ink)] sm:text-xl">
              Consulte un asesor
            </h3>
            <p className="mt-1 text-sm text-[var(--color-ink-secondary)]">{propertyTitle}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={resetAndClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-ink-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--color-ink)]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-teal)]/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-accent-teal)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-6 w-6"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">¡Gracias, {name.trim().split(" ")[0]}!</h3>
            <p className="text-sm text-[var(--color-ink-secondary)]">
              {salespersonName} se pondrá en contacto con vos por WhatsApp a la brevedad.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
              Nombre completo
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
              Número de WhatsApp
              <input
                required
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="+598 99 123 456"
                className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
              Elegí un asesor
              {loadingSalespeople ? (
                <p className="text-sm text-[var(--color-ink-secondary)]">Cargando asesores…</p>
              ) : loadError ? (
                <p className="text-sm text-[var(--color-accent-red-text)]">{loadError}</p>
              ) : salespeople.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-secondary)]">
                  No hay asesores disponibles en este momento.
                </p>
              ) : (
                <select
                  required
                  value={salespersonName}
                  onChange={(event) => setSalespersonName(event.target.value)}
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
                >
                  <option value="" disabled>
                    Seleccioná un asesor
                  </option>
                  {salespeople.map((person) => (
                    <option key={person.id} value={person.name}>
                      {person.name}
                    </option>
                  ))}
                </select>
              )}
            </label>

            {error && <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar solicitud"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
