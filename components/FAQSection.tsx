"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    question: "¿Qué servicios incluye la plataforma Cronus para propietarios?",
    answer:
      "Cronus ofrece una gestión centralizada que incluye control de cartera en tiempo real, seguimiento de leads, automatización de contratos, reportes financieros y sincronización con portales inmobiliarios.",
  },
  {
    question: "¿Cómo se realiza la tasación de una propiedad?",
    answer:
      "Realizamos un análisis comparativo de mercado (ACM) basado en transacciones recientes en la zona, estado actual del inmueble, ubicación privilegiada y tendencias de demanda en Punta del Este.",
  },
  {
    question: "¿Cuál es el proceso legal para comprar una propiedad en Uruguay siendo extranjero?",
    answer:
      "El proceso es sumamente ágil y seguro. Los extranjeros disfrutan de los mismos derechos que los ciudadanos locales para adquirir bienes raíces, requiriendo únicamente Cédula de Identidad fiscal o trámite de residencia legal según corresponda, con el respaldo de un escribano público.",
  },
  {
    question: "¿Cómo gestionan la confidencialidad de las operaciones y los datos?",
    answer:
      "Implementamos protocolos estrictos de seguridad de la información, control de accesos por roles y acuerdos de confidencialidad (NDA) para proteger la privacidad tanto de inversores como de propietarios de alto perfil.",
  },
  {
    question: "¿Qué comisión cobra la inmobiliaria por intermediación en compraventa?",
    answer:
      "Los honorarios estándar de mercado en Uruguay son del 3% más IVA para cada una de las partes (comprador y vendedor), sujetos a los términos específicos de cada mandato de venta exclusivo o abierto.",
  },
  {
    question: "¿Cómo funciona la administración de alquileres temporarios y anuales?",
    answer:
      "Nos encargamos de todo el ciclo operativo: publicación, selección y verificación de inquilinos, check-in/check-out, mantenimiento preventivo, cobranzas automatizadas y liquidación mensual de expensas e ingresos para el propietario.",
  },
  {
    question: "¿Qué documentación necesito para poner mi propiedad a la venta?",
    answer:
      "Título de propiedad inscripto, certificado de antecedentes dominiales, plano de mensura, constancia de pago de contribución inmobiliaria e impuesto de primaria, y cédula catastral al día.",
  },
  {
    question: "¿Puedo acceder a Cronus y ver el estado de mis propiedades desde el exterior?",
    answer:
      "Sí. Cronus es una plataforma 100% digital basada en la nube, lo que te permite monitorear el estado de tus propiedades, consultas de clientes y reportes de rendimiento desde cualquier lugar del mundo.",
  },
  {
    question: "¿Qué zonas geográficas abarca principalmente la inmobiliaria?",
    answer:
      "Nos especializamos en las zonas más exclusivas de Punta del Este y sus al rededores, incluyendo Playa Mansa, Playa Brava, La Barra, Manantiales, José Ignacio y barrios privados de Carrasco y Beverly Hills.",
  },
  {
    question: "¿Cómo puedo coordinar una visita a una propiedad o agendar una reunión con un asesor?",
    answer:
      "Puedes solicitar una visita directamente a través de los canales de contacto de nuestro sitio web o iniciar sesión en el portal para coordinar una atención preferencial con un ejecutivo de cuenta.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="border-t border-[var(--color-border)] px-[15px] py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Preguntas Frecuentes
        </h2>
        <p className="mt-4 text-[var(--color-ink-secondary)]">
          Todo lo que necesitas saber sobre nuestros servicios de gestión inmobiliaria, compra, venta y
          administración de propiedades en Punta del Este.
        </p>
        <p className="mt-2 text-[var(--color-ink-secondary)]">
          Si tienes alguna consulta adicional que no figure en este listado, nuestro equipo de asesores está
          disponible para atenderte de manera personalizada.
        </p>

        <div className="mt-10 flex flex-col">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <div key={item.question} className="border-t border-[var(--color-border)] last:border-b">
                <h3>
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-semibold text-[var(--color-ink)]">{item.question}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`h-5 w-5 flex-shrink-0 text-[var(--color-ink-secondary)] transition-transform duration-300 ${
                        isOpen ? "rotate-45" : ""
                      }`}
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 text-[var(--color-ink-secondary)]">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
