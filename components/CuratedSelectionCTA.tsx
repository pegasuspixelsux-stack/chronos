"use client";

import { useState } from "react";
import CuratedSelectionModal from "@/components/CuratedSelectionModal";

export default function CuratedSelectionCTA() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[15px] py-16 sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Una selección curada, pensada para usted.
          </h2>
          <p className="mt-3 text-[var(--color-ink-secondary)]">
            Cuéntenos qué está buscando y un asesor le acercará las propiedades que mejor se ajustan a su
            presupuesto, plazos y zonas preferidas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex flex-shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Recibir mi selección curada
        </button>
      </div>

      <CuratedSelectionModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </section>
  );
}
