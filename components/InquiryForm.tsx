"use client";

import { useState, type FormEvent } from "react";
import { createLead } from "@/lib/leads";

export default function InquiryForm({
  propertyId,
  propertyTitle,
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const [expanded, setExpanded] = useState(false);
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
      await createLead({
        propertyId,
        propertyTitle,
        name,
        email,
        phone,
        message,
        status: "new",
      });
      setSubmitted(true);
    } catch {
      setError("Could not send your inquiry. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p className="mt-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-ink)]">
        Thanks — we&apos;ve received your inquiry and will be in touch soon.
      </p>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-10 inline-flex items-center justify-center rounded-md bg-[var(--color-accent-teal)] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
      >
        Inquire about this property
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
    >
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Name
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Phone (optional)
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Message (optional)
        <textarea
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      {error && <p className="text-sm text-[var(--color-accent-red-text)]">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
