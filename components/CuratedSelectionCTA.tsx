"use client";

import { useState } from "react";
import CuratedSelectionModal from "@/components/CuratedSelectionModal";

export default function CuratedSelectionCTA() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[15px] py-16 sm:px-6 sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-[var(--color-accent-teal)]/10 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--color-accent-teal)] uppercase">
            Asesoría Inmobiliaria Boutique
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            No pierda tiempo buscando entre cientos de propiedades. Deje que nuestros expertos seleccionen la
            ideal para usted.
          </h2>
          <p className="mt-3 text-[var(--color-ink-secondary)]">
            Si prefiere explorar por su cuenta, puede recorrer libremente nuestra lista completa de propiedades
            en el inventario. Pero si busca eficiencia, le invitamos a aprovechar nuestra experiencia y profundo
            conocimiento del mercado. Uno de nuestros asesores analizará sus preferencias, su propósito de
            inversión y sus expectativas para entregarle una selección curada y a la medida, evitando que pierda
            tiempo en opciones que no se adaptan a lo que realmente necesita lograr.
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
