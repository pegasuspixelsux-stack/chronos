import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { getSiteSettings } from "@/lib/settings";

export default async function ContactSection() {
  let settings = null;
  try {
    settings = await getSiteSettings();
  } catch {
    settings = null;
  }

  const address = settings?.address || "";
  const contactEmail = settings?.contactEmail || "";
  const phone = settings?.phone || "";
  const whatsappNumber = settings?.whatsappNumber || "";
  const whatsappDigits = whatsappNumber.replace(/\D/g, "");

  const hasContactDetails = Boolean(address || contactEmail || phone || whatsappNumber);

  return (
    <section id="contacto" className="border-t border-[var(--color-border)] px-[15px] py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Hablemos de tu próxima propiedad
          </h2>
          <p className="mt-3 text-[var(--color-ink-secondary)]">
            Escribinos tu consulta o comunicate directamente con nuestro equipo — estamos para ayudarte en cada
            paso del camino.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <ContactForm />

          {hasContactDetails && (
            <div className="flex flex-col gap-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
              {address && (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-accent-teal)]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Oficina</p>
                    <p className="mt-0.5 text-sm text-[var(--color-ink-secondary)]">{address}</p>
                  </div>
                </div>
              )}

              {contactEmail && (
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-accent-teal)]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Correo</p>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="mt-0.5 block text-sm text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-teal)] hover:underline"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </div>
              )}

              {phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-accent-teal)]" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Teléfono</p>
                    <a
                      href={`tel:${phone}`}
                      className="mt-0.5 block text-sm text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-teal)] hover:underline"
                    >
                      {phone}
                    </a>
                  </div>
                </div>
              )}

              {whatsappNumber && (
                <div className="flex items-start gap-3">
                  <MessageCircle
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-accent-teal)]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">WhatsApp</p>
                    <a
                      href={`https://wa.me/${whatsappDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block text-sm text-[var(--color-ink-secondary)] hover:text-[var(--color-accent-teal)] hover:underline"
                    >
                      {whatsappNumber}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
