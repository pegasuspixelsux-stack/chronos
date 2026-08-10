import Link from "next/link";
import { getSiteSettings } from "@/lib/settings";

export default async function Footer() {
  let settings = null;
  try {
    settings = await getSiteSettings();
  } catch {
    settings = null;
  }

  const address = settings?.address || "";
  const phone = settings?.phone || "";
  const whatsappNumber = settings?.whatsappNumber || "";
  const whatsappDigits = whatsappNumber.replace(/\D/g, "");
  const contactEmail = settings?.contactEmail || "";
  const businessHours = settings?.businessHours || "";

  const hasContactDetails = Boolean(address || phone || whatsappNumber || contactEmail || businessHours);

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bone)]">
      <div className="mx-auto flex max-w-6xl flex-col flex-wrap gap-8 px-6 py-12 text-sm text-[var(--color-ink-secondary)] sm:flex-row sm:justify-between">
        <div className="sm:max-w-xs">
          <p className="text-base font-bold text-[var(--color-ink)]">Chronos</p>
          <p className="mt-2">Asesoría inmobiliaria boutique en Punta del Este.</p>
        </div>

        {hasContactDetails && (
          <div className="sm:max-w-xs">
            <p className="text-sm font-semibold text-[var(--color-ink)]">Contacto</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {address && <li>{address}</li>}
              {phone && (
                <li>
                  <a href={`tel:${phone}`} className="transition-colors hover:text-[var(--color-ink)] hover:underline">
                    {phone}
                  </a>
                </li>
              )}
              {whatsappNumber && (
                <li>
                  <a
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-[var(--color-ink)] hover:underline"
                  >
                    WhatsApp: {whatsappNumber}
                  </a>
                </li>
              )}
              {contactEmail && (
                <li>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="transition-colors hover:text-[var(--color-ink)] hover:underline"
                  >
                    {contactEmail}
                  </a>
                </li>
              )}
              {businessHours && <li>{businessHours}</li>}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:items-end sm:text-right">
          <p>&copy; {new Date().getFullYear()} Chronos Real Estate. Todos los derechos reservados.</p>
          <Link href="/admin/login" className="transition-colors hover:text-[var(--color-ink)]">
            Administración
          </Link>
        </div>
      </div>
    </footer>
  );
}
