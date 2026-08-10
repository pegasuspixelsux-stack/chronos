"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import {
  ACQUISITION_SOURCES,
  BUDGET_RANGES,
  PREFERRED_AREAS,
  PROPERTY_SIZE_RANGES,
  PROPERTY_USAGES,
  TIMEFRAMES,
  type AcquisitionSource,
  type BudgetRange,
  type PreferredArea,
  type PropertySizeRange,
  type PropertyUsage,
  type Timeframe,
} from "@/lib/types";

const TOTAL_STEPS = 7;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PillOption({
  label,
  selected,
  onSelect,
  role,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  role: "radio" | "checkbox";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={`rounded-full border px-4 py-2 text-left text-sm transition-colors ${
        selected
          ? "border-[var(--color-accent-teal)] bg-[var(--color-accent-teal)] text-white"
          : "border-[var(--color-border)] text-[var(--color-ink)] hover:border-[var(--color-accent-teal)]"
      }`}
    >
      {label}
    </button>
  );
}

function StepShell({
  headingId,
  title,
  subtitle,
  children,
}: {
  headingId: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 id={headingId} className="text-lg font-semibold text-[var(--color-ink)] sm:text-xl">
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-sm text-[var(--color-ink-secondary)]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function CuratedSelectionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const headingId = useId();

  const [step, setStep] = useState(0);
  const [acquisitionSource, setAcquisitionSource] = useState<AcquisitionSource | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);
  const [propertyUsage, setPropertyUsage] = useState<PropertyUsage | null>(null);
  const [preferredAreas, setPreferredAreas] = useState<PreferredArea[]>([]);
  const [propertySize, setPropertySize] = useState<PropertySizeRange | null>(null);
  const [budgetRange, setBudgetRange] = useState<BudgetRange | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    // Give the close transition a moment before wiping state, so the
    // panel doesn't visibly flash back to step 1 while fading out.
    setTimeout(() => {
      setStep(0);
      setAcquisitionSource(null);
      setTimeframe(null);
      setPropertyUsage(null);
      setPreferredAreas([]);
      setPropertySize(null);
      setBudgetRange(null);
      setName("");
      setEmail("");
      setPhone("");
      setSubmitted(false);
      setError(null);
    }, 300);
  }

  function toggleArea(area: PreferredArea) {
    setPreferredAreas((current) =>
      current.includes(area) ? current.filter((item) => item !== area) : [...current, area]
    );
  }

  const canProceed =
    (step === 0 && acquisitionSource !== null) ||
    (step === 1 && timeframe !== null) ||
    (step === 2 && propertyUsage !== null) ||
    (step === 3 && preferredAreas.length > 0) ||
    (step === 4 && propertySize !== null) ||
    (step === 5 && budgetRange !== null);

  const canSubmit =
    name.trim().length > 0 && EMAIL_PATTERN.test(email.trim()) && phone.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!timeframe || !acquisitionSource || !propertyUsage || !propertySize || !budgetRange) return;
    setError(null);
    setSubmitting(true);
    try {
      const [{ createQualifiedLead }, { calculateReadinessScore, classifyLeadTemperature }] = await Promise.all([
        import("@/lib/qualified-leads"),
        import("@/lib/lead-scoring"),
      ]);
      const answers = { timeframe, budgetRange, propertyUsage, preferredAreas };
      await createQualifiedLead({
        acquisitionSource,
        timeframe,
        propertyUsage,
        preferredAreas,
        propertySize,
        budgetRange,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        readinessScore: calculateReadinessScore(answers),
        leadTemperature: classifyLeadTemperature(answers),
        status: "new",
      });
      setSubmitted(true);
    } catch {
      setError("No pudimos enviar tu selección. Verificá tu conexión e intentá nuevamente.");
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
        className="relative flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-[var(--color-surface)] shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <p className="text-sm font-medium text-[var(--color-ink-secondary)]">
            {submitted ? "Listo" : `Paso ${step + 1} de ${TOTAL_STEPS}`}
          </p>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={resetAndClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--color-ink)]"
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

        {!submitted && (
          <div className="h-1 w-full bg-[var(--color-border)]">
            <div
              className="h-1 bg-[var(--color-accent-teal)] transition-all duration-300 ease-in-out"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        )}

        <div className="overflow-y-auto px-6 py-6">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
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
                Hemos recibido tus preferencias. Uno de nuestros asesores se pondrá en contacto contigo en breve
                para compartir tu selección curada de propiedades.
              </p>
            </div>
          ) : (
            <>
              {step === 0 && (
                <StepShell headingId={headingId} title="¿Cómo nos conoció?">
                  <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-2">
                    {ACQUISITION_SOURCES.map((option) => (
                      <PillOption
                        key={option}
                        role="radio"
                        label={option}
                        selected={acquisitionSource === option}
                        onSelect={() => setAcquisitionSource(option)}
                      />
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 1 && (
                <StepShell headingId={headingId} title="¿Cuál es su horizonte de tiempo?">
                  <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-2">
                    {TIMEFRAMES.map((option) => (
                      <PillOption
                        key={option}
                        role="radio"
                        label={option}
                        selected={timeframe === option}
                        onSelect={() => setTimeframe(option)}
                      />
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 2 && (
                <StepShell headingId={headingId} title="¿Cuál será el uso principal de la propiedad?">
                  <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-2">
                    {PROPERTY_USAGES.map((option) => (
                      <PillOption
                        key={option}
                        role="radio"
                        label={option}
                        selected={propertyUsage === option}
                        onSelect={() => setPropertyUsage(option)}
                      />
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 3 && (
                <StepShell
                  headingId={headingId}
                  title="¿Cuáles son sus zonas preferidas?"
                  subtitle="Puede seleccionar más de una."
                >
                  <div role="group" aria-labelledby={headingId} className="flex flex-wrap gap-2">
                    {PREFERRED_AREAS.map((option) => (
                      <PillOption
                        key={option}
                        role="checkbox"
                        label={option}
                        selected={preferredAreas.includes(option)}
                        onSelect={() => toggleArea(option)}
                      />
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 4 && (
                <StepShell headingId={headingId} title="¿Qué tamaño o superficie busca?">
                  <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-2">
                    {PROPERTY_SIZE_RANGES.map((option) => (
                      <PillOption
                        key={option}
                        role="radio"
                        label={option}
                        selected={propertySize === option}
                        onSelect={() => setPropertySize(option)}
                      />
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 5 && (
                <StepShell headingId={headingId} title="¿Cuál es su rango de presupuesto estimado?">
                  <div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-2">
                    {BUDGET_RANGES.map((option) => (
                      <PillOption
                        key={option}
                        role="radio"
                        label={option}
                        selected={budgetRange === option}
                        onSelect={() => setBudgetRange(option)}
                      />
                    ))}
                  </div>
                </StepShell>
              )}

              {step === 6 && (
                <StepShell
                  headingId={headingId}
                  title="Casi listo — sus datos de contacto"
                  subtitle="Así podremos enviarle su selección curada."
                >
                  <div className="flex flex-col gap-3">
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
                      Correo electrónico
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
                      Teléfono / WhatsApp (con código de país)
                      <input
                        required
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+598 99 123 456"
                        className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
                      />
                    </label>
                    {error && <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>}
                  </div>
                </StepShell>
              )}
            </>
          )}
        </div>

        {!submitted && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-6 py-4">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0}
              className="rounded-md px-4 py-2 text-sm font-medium text-[var(--color-ink-secondary)] transition-colors hover:text-[var(--color-ink)] disabled:opacity-0"
            >
              Atrás
            </button>
            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current + 1)}
                disabled={!canProceed}
                className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Enviando…" : "Recibir mi selección curada"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
