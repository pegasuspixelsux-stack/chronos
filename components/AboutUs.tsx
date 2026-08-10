const VALUES = [
  {
    title: "Propiedades verificadas",
    description:
      "Cada propiedad en Chronos es revisada por nuestro equipo antes de publicarse, así lo que ves es realmente lo que está en venta.",
  },
  {
    title: "Conocimiento local",
    description:
      "Nuestros asesores trabajan en los mismos barrios que representan, y pueden guiarte en zonificación, valor de reventa y tiempos de traslado.",
  },
  {
    title: "Sin presión",
    description: "Explorá, preseleccioná y consultá a tu propio ritmo. Te contactamos solo cuando lo pedís, no antes.",
  },
];

export default function AboutUs() {
  return (
    <section
      id="about"
      className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[15px] py-24 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Construido sobre la confianza, no solo transacciones
          </h2>
          <p className="mt-4 text-[var(--color-ink-secondary)]">
            Desde el primer día, Chronos acompaña a compradores e inquilinos en el mercado inmobiliario.
            Mantenemos un catálogo lo suficientemente selecto como para verificar cada propiedad
            personalmente, y lo suficientemente amplio como para ofrecerte opciones reales.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {VALUES.map((value) => (
            <div key={value.title} className="border-t border-[var(--color-border)] pt-6">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">{value.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
