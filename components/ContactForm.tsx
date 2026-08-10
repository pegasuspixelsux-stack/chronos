"use client";

import { useState, type FormEvent } from "react";

const GENERAL_INQUIRY_PROPERTY_ID = "general-inquiry";
const GENERAL_INQUIRY_PROPERTY_TITLE = "Consulta general (formulario de contacto)";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { createLead } = await import("@/lib/leads");
      await createLead({
        propertyId: GENERAL_INQUIRY_PROPERTY_ID,
        propertyTitle: GENERAL_INQUIRY_PROPERTY_TITLE,
        name,
        email,
        phone,
        message,
        status: "new",
      });
      setSubmitted(true);
    } catch {
      setError("No pudimos enviar tu mensaje. Verificá tu conexión e intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-ink)]">
        Gracias — recibimos tu mensaje y nos pondremos en contacto a la brevedad.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Nombre completo
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Correo electrónico
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Teléfono / WhatsApp
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+598 99 123 456"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Mensaje
        <textarea
          rows={4}
          required
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      {error && <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
      >
        {submitting ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
