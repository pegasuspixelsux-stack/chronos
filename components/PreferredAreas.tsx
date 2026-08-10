import Link from "next/link";

const AREAS = [
  {
    name: "Península",
    imageSeed: "chronos-area-peninsula",
    span: "sm:col-span-2 sm:row-span-2",
  },
  {
    name: "La Mansa",
    imageSeed: "chronos-area-la-mansa",
    span: "sm:col-span-2",
  },
  {
    name: "Playa Brava",
    imageSeed: "chronos-area-playa-brava",
    span: "",
  },
  {
    name: "La Barra",
    imageSeed: "chronos-area-la-barra",
    span: "",
  },
  {
    name: "Manantiales",
    imageSeed: "chronos-area-manantiales",
    span: "sm:col-span-2",
  },
  {
    name: "José Ignacio",
    imageSeed: "chronos-area-jose-ignacio",
    span: "sm:col-span-2",
  },
];

export default function PreferredAreas() {
  return (
    <section className="border-t border-[var(--color-border)] px-[15px] py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Explora las zonas más exclusivas de Punta del Este
          </h2>
          <p className="mt-3 text-[var(--color-ink-secondary)]">
            Cada rincón de nuestra costa ofrece un estilo de vida único. Descubre nuestras ubicaciones
            predilectas y encuentra el entorno perfecto para tu próxima inversión.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:auto-rows-[220px] sm:grid-cols-4">
          {AREAS.map((area) => (
            <Link
              key={area.name}
              href={{ pathname: "/properties", query: { location: area.name } }}
              className={`group relative block h-64 overflow-hidden rounded-xl bg-[var(--color-bone)] sm:h-auto ${area.span}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://picsum.photos/seed/${area.imageSeed}/1200/1200`}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-3">
                <h3 className="text-lg font-bold text-white sm:text-xl">{area.name}</h3>
                <span className="flex items-center gap-1 text-sm font-medium text-white opacity-90 transition-transform duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                  Ver más
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
