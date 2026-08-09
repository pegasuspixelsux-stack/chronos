import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import AboutUs from "@/components/AboutUs";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedProperties />
      <AboutUs />
    </>
  );
}
