const HERO_IMAGE_URL = "https://picsum.photos/seed/chronos-hero/1920/1080";

export default function Hero() {
  return (
    <section
      className="relative h-[70vh] min-h-[480px] w-full bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(to top right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, transparent 80%), url(${HERO_IMAGE_URL})`,
      }}
    >
      <div className="absolute bottom-8 left-8 max-w-xl">
        <h1 className="text-3xl font-bold text-white md:text-4xl">
          Find a home that fits your next chapter.
        </h1>
        <p className="mt-2 text-lg text-gray-200">
          Chronos curates verified listings across houses, apartments, and land — so you spend less time
          searching and more time deciding.
        </p>
      </div>
    </section>
  );
}
