"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PROPERTY_TYPES } from "@/lib/types";

const HERO_IMAGE_URL = "https://picsum.photos/seed/chronos-hero/1920/1080";

export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [location, setLocation] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (propertyType) params.set("propertyType", propertyType);
    if (location) params.set("location", location);
    router.push(`/properties${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <section
      className="relative bg-cover bg-center px-6 py-28 sm:py-36"
      style={{
        backgroundImage: `linear-gradient(rgba(15,15,15,0.55), rgba(15,15,15,0.55)), url(${HERO_IMAGE_URL})`,
      }}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl">
          Find a home that fits your next chapter.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
          Chronos curates verified listings across houses, apartments, and land — so you spend less time
          searching and more time deciding.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left shadow-lg sm:flex-row"
        >
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by keyword"
            className="flex-1 rounded-md border border-transparent bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-border)]"
          />
          <select
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
          >
            <option value="">Any type</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-border)]"
          />
          <button
            type="submit"
            className="rounded-md bg-[var(--color-accent-teal)] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-teal-hover)]"
          >
            Search
          </button>
        </form>
      </div>
    </section>
  );
}
