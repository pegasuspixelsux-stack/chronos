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
            Permita que nuestros expertos seleccionen la propiedad ideal para usted.
          </h2>
          <p className="mt-3 text-[var(--color-ink-secondary)]">
            Si prefiere explorar de manera independiente, puede recorrer en cualquier momento la lista completa
            de nuestro inventario. Sin embargo, le invitamos a aprovechar la experiencia y el profundo
            conocimiento de nuestros asesores.
          </p>
          <p className="mt-3 text-[var(--color-ink-secondary)]">
            Comparta con nosotros sus preferencias y los objetivos que desea alcanzar, y nos encargaremos de
            poner nuestra trayectoria a su servicio para entregarle una selección curada y perfectamente
            alineada con lo que está buscando.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex flex-shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
        >
          Solicitar mi selección curada
        </button>
      </div>

      <CuratedSelectionModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </section>
  );
}
