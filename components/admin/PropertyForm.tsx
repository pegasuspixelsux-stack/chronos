"use client";

import { useState, type FormEvent } from "react";
import { HERO_SLIDER_LIMIT } from "@/lib/property-utils";
import { PROPERTY_TYPES, type PropertyInput, type PropertyType } from "@/lib/types";

const EMPTY_FORM: PropertyInput = {
  title: "",
  description: "",
  price: 0,
  propertyType: "House",
  location: "",
  bedrooms: 0,
  bathrooms: 0,
  areaSqm: 0,
  imageUrl: "",
  featured: false,
  inHeroSlider: false,
};

export default function PropertyForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  sliderCount,
}: {
  initialValues?: PropertyInput;
  submitLabel: string;
  onSubmit: (values: PropertyInput) => Promise<void>;
  onCancel?: () => void;
  sliderCount: number;
}) {
  const [values, setValues] = useState<PropertyInput>(initialValues ?? EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSliderToggle(checked: boolean) {
    if (checked && sliderCount >= HERO_SLIDER_LIMIT) {
      window.alert("Maximum of 5 properties can be featured in the hero slider.");
      return;
    }
    update("inHeroSlider", checked);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save this property. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Title
        <input
          required
          value={values.title}
          onChange={(event) => update("title", event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Description
        <textarea
          rows={4}
          value={values.description}
          onChange={(event) => update("description", event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Price (USD)
        <input
          type="number"
          required
          min={0}
          value={values.price}
          onChange={(event) => update("price", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Property type
        <select
          value={values.propertyType}
          onChange={(event) => update("propertyType", event.target.value as PropertyType)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Location
        <input
          required
          value={values.location}
          onChange={(event) => update("location", event.target.value)}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Bedrooms
        <input
          type="number"
          min={0}
          value={values.bedrooms}
          onChange={(event) => update("bedrooms", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Bathrooms
        <input
          type="number"
          min={0}
          value={values.bathrooms}
          onChange={(event) => update("bathrooms", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)]">
        Area (m²)
        <input
          type="number"
          min={0}
          value={values.areaSqm}
          onChange={(event) => update("areaSqm", Number(event.target.value))}
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-[var(--color-ink)] sm:col-span-2">
        Image URL
        <input
          value={values.imageUrl}
          onChange={(event) => update("imageUrl", event.target.value)}
          placeholder="https://…"
          className="rounded-md border border-[var(--color-border)] px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-teal)] focus-visible:ring-offset-1"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--color-ink)] sm:col-span-2">
        <input
          type="checkbox"
          checked={values.featured}
          onChange={(event) => update("featured", event.target.checked)}
        />
        Feature on homepage
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--color-ink)] sm:col-span-2">
        <input
          type="checkbox"
          checked={values.inHeroSlider}
          onChange={(event) => handleSliderToggle(event.target.checked)}
        />
        Feature in Hero Slider ({sliderCount}/{HERO_SLIDER_LIMIT} used)
      </label>

      {error && <p className="text-sm text-[var(--color-accent-red-text)] sm:col-span-2">{error}</p>}

      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)] disabled:opacity-60"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[var(--color-border)] px-6 py-2 text-sm text-[var(--color-ink)]"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
