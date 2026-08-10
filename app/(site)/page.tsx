import Hero from "@/components/Hero";
import HeroSlider from "@/components/HeroSlider";
import TrustSection from "@/components/TrustSection";
import FeaturedProperties from "@/components/FeaturedProperties";
import PreferredAreas from "@/components/PreferredAreas";
import AboutUs from "@/components/AboutUs";
import FAQSection from "@/components/FAQSection";
import TestimonialsMarquee from "@/components/TestimonialsMarquee";
import CuratedSelectionCTA from "@/components/CuratedSelectionCTA";
import { getHeroSliderProperties } from "@/lib/properties";
import type { Property } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  let sliderProperties: Property[] = [];
  try {
    sliderProperties = await getHeroSliderProperties();
  } catch {
    sliderProperties = [];
  }

  return (
    <>
      {sliderProperties.length > 0 ? <HeroSlider properties={sliderProperties} /> : <Hero />}
      <TrustSection />
      <FeaturedProperties />
      <PreferredAreas />
      <CuratedSelectionCTA />
      <AboutUs />
      <TestimonialsMarquee />
      <FAQSection />
    </>
  );
}
