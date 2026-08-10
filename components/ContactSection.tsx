import ContactForm from "@/components/ContactForm";

export default function ContactSection() {
  return (
    <section id="contacto" className="border-t border-[var(--color-border)] px-[15px] py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Hablemos de tu próxima propiedad
        </h2>
        <p className="mt-3 text-[var(--color-ink-secondary)]">
          Escribinos tu consulta o comunicate directamente con nuestro equipo — estamos para ayudarte en cada
          paso del camino.
        </p>

        <div className="mt-10">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
