const HERO_IMAGE_URL = "https://picsum.photos/seed/chronos-hero/1920/1080";

export default function Hero() {
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
      </div>
    </section>
  );
}
