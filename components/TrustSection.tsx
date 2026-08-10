const PILLARS = [
  {
    title: "Control total de cartera:",
    description: "Gestión centralizada y en tiempo real para inversores y propietarios.",
  },
  {
    title: "Asesoramiento integral:",
    description: "Desde el análisis legal y de títulos hasta la postventa y administración de alquileres.",
  },
  {
    title: "Confidencialidad absoluta:",
    description: "Manejo estricto y seguro de la información de cada cliente y propiedad.",
  },
];

export default function TrustSection() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-[15px] py-20 sm:px-6 sm:py-24">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Llevamos la gestión inmobiliaria a otro nivel en Punta del Este.
          </h2>
          <p className="mt-4 text-[var(--color-ink-secondary)]">
            Unimos un profundo conocimiento del mercado local con altos estándares internacionales, ofreciendo una
            experiencia de compra, venta y administración ágil, transparente y sin fricciones.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Transparencia y rigor operativo en cada operación.
          </h2>
          <ul className="mt-6 flex flex-col gap-5">
            {PILLARS.map((pillar) => (
              <li key={pillar.title} className="border-t border-[var(--color-border)] pt-4">
                <p className="text-[var(--color-ink-secondary)]">
                  <span className="font-semibold text-[var(--color-ink)]">{pillar.title}</span>{" "}
                  {pillar.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
