const TESTIMONIALS = [
  {
    name: "Santiago Larrañaga",
    role: "Inversionista, Playa Mansa",
    rating: 5,
    comment:
      "Cronus transformó por completo la gestión de mi cartera. La transparencia y el control en tiempo real superaron todas mis expectativas.",
  },
  {
    name: "Mariana Valdés",
    role: "Propietaria, José Ignacio",
    rating: 5,
    comment:
      "Un nivel de profesionalismo único en Punta del Este. Vendieron nuestra propiedad en tiempo récord y con absoluta discreción.",
  },
  {
    name: "Eduardo Sampaio",
    role: "Desarrollador Inmobiliario",
    rating: 5,
    comment:
      "La plataforma y el equipo de asesores ofrecen un soporte impecable. El rigor operativo que manejan da muchísima tranquilidad.",
  },
  {
    name: "Carolina Etcheverry",
    role: "Compradora, La Barra",
    rating: 5,
    comment:
      "El proceso de compra fue ágil y transparente de principio a fin. Nos acompañaron en cada detalle legal y técnico.",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={index < rating ? "var(--color-accent-teal)" : "none"}
          stroke="var(--color-accent-teal)"
          strokeWidth={1.5}
          aria-hidden="true"
          className="h-4 w-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2.5l2.9 6.4 6.99.7-5.25 4.77 1.55 6.9L12 17.9l-6.19 3.37 1.55-6.9L2.11 9.6l6.99-.7z"
          />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: (typeof TESTIMONIALS)[number] }) {
  return (
    <div className="w-80 flex-shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm sm:w-96">
      <StarRating rating={testimonial.rating} />
      <p className="mt-4 text-[var(--color-ink)]">&ldquo;{testimonial.comment}&rdquo;</p>
      <div className="mt-5">
        <p className="font-semibold text-[var(--color-ink)]">{testimonial.name}</p>
        <p className="text-sm text-[var(--color-ink-secondary)]">{testimonial.role}</p>
      </div>
    </div>
  );
}

export default function TestimonialsMarquee() {
  return (
    <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-[15px] sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Lo que dicen nuestros clientes
        </h2>
      </div>

      <ul className="sr-only">
        {TESTIMONIALS.map((testimonial) => (
          <li key={testimonial.name}>
            {testimonial.name}, {testimonial.role}: &ldquo;{testimonial.comment}&rdquo; ({testimonial.rating}/5)
          </li>
        ))}
      </ul>

      <div className="group mt-10 overflow-hidden" aria-hidden="true">
        <div className="flex w-max gap-6 animate-[marquee_40s_linear_infinite] group-hover:[animation-play-state:paused]">
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={`${testimonial.name}-repeat`} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
