const VALUES = [
  {
    title: "Verified listings",
    description:
      "Every property on Chronos is reviewed by our team before it goes live, so what you see is what's actually for sale.",
  },
  {
    title: "Local expertise",
    description:
      "Our agents work the neighborhoods they list in, and can walk you through zoning, resale value, and commute realities.",
  },
  {
    title: "No pressure process",
    description: "Browse, shortlist, and inquire on your own timeline. We follow up when you ask us to, not before.",
  },
];

export default function AboutUs() {
  return (
    <section
      id="about"
      className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-[10px] py-24 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            Built on trust, not just transactions
          </h2>
          <p className="mt-4 text-[var(--color-ink-secondary)]">
            Chronos has helped buyers and renters navigate the market since day one. We keep our catalog small
            enough to vet personally, and large enough to give you real choice.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {VALUES.map((value) => (
            <div key={value.title} className="border-t border-[var(--color-border)] pt-6">
              <h3 className="text-lg font-semibold text-[var(--color-ink)]">{value.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
