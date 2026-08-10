const HERO_IMAGE_URL = "https://picsum.photos/seed/chronos-hero/1920/1080";

export default function Hero() {
  return (
    <section
      className="relative h-[80vh] min-h-[480px] w-full bg-cover bg-center"
      style={{
        backgroundImage: `linear-gradient(to top right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, transparent 80%), url(${HERO_IMAGE_URL})`,
      }}
    >
      <div className="absolute bottom-8 left-[15px] max-w-xl sm:left-8">
        <h1 className="text-3xl font-bold text-white md:text-4xl">
          Encontrá el hogar que se ajusta a tu próximo capítulo.
        </h1>
        <p className="mt-2 text-lg text-gray-200">
          Chronos selecciona propiedades verificadas entre casas, apartamentos y terrenos, para dedicar menos
          tiempo a buscar y más tiempo a decidir.
        </p>
      </div>
    </section>
  );
}
