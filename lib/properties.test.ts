import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import {
  canAddImages,
  countSliderSlots,
  formatPrice,
  isAllowedImageFile,
  mapDocToProperty,
  matchesFilters,
  removedImageUrls,
} from "@/lib/property-utils";
import type { Property } from "@/lib/types";

describe("mapDocToProperty", () => {
  it("maps a Firestore document into a Property, converting the timestamp to millis", () => {
    const createdAt = Timestamp.fromMillis(1700000000000);
    const property = mapDocToProperty("abc123", {
      title: "Hillside Cottage",
      description: "A quiet retreat.",
      price: 250000,
      propertyType: "House",
      location: "Asheville, NC",
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 140,
      imageUrls: ["https://example.com/house.jpg", "https://example.com/house-2.jpg"],
      featured: true,
      inHeroSlider: true,
      createdAt,
    });

    expect(property).toEqual({
      id: "abc123",
      title: "Hillside Cottage",
      description: "A quiet retreat.",
      price: 250000,
      propertyType: "House",
      location: "Asheville, NC",
      bedrooms: 3,
      bathrooms: 2,
      areaSqm: 140,
      imageUrls: ["https://example.com/house.jpg", "https://example.com/house-2.jpg"],
      featured: true,
      inHeroSlider: true,
      createdAt: 1700000000000,
    });
  });

  it("wraps a legacy single imageUrl string into imageUrls for pre-gallery documents", () => {
    const property = mapDocToProperty("legacy1", {
      title: "Old Listing",
      imageUrl: "https://example.com/old-house.jpg",
    });
    expect(property.imageUrls).toEqual(["https://example.com/old-house.jpg"]);
  });

  it("fills in safe defaults for missing fields", () => {
    const property = mapDocToProperty("xyz", {});
    expect(property.title).toBe("");
    expect(property.price).toBe(0);
    expect(property.propertyType).toBe("House");
    expect(property.featured).toBe(false);
    expect(property.inHeroSlider).toBe(false);
    expect(property.imageUrls).toEqual([]);
  });
});

describe("formatPrice", () => {
  it("formats a number as whole-dollar USD currency", () => {
    expect(formatPrice(250000)).toBe("$250,000");
  });
});

describe("matchesFilters", () => {
  const base: Property = {
    id: "1",
    title: "Hillside Cottage",
    description: "A quiet retreat near the trailhead.",
    price: 250000,
    propertyType: "House",
    location: "Asheville, NC",
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 140,
    imageUrls: [],
    featured: true,
    inHeroSlider: false,
    createdAt: 0,
  };

  it("passes when no filters are set", () => {
    expect(matchesFilters(base, {})).toBe(true);
  });

  it("filters out a mismatched property type", () => {
    expect(matchesFilters(base, { propertyType: "Apartment" })).toBe(false);
  });

  it("filters by case-insensitive location substring", () => {
    expect(matchesFilters(base, { location: "asheville" })).toBe(true);
    expect(matchesFilters(base, { location: "Denver" })).toBe(false);
  });

  it("filters by price range", () => {
    expect(matchesFilters(base, { minPrice: 300000 })).toBe(false);
    expect(matchesFilters(base, { maxPrice: 200000 })).toBe(false);
    expect(matchesFilters(base, { minPrice: 100000, maxPrice: 300000 })).toBe(true);
  });

  it("filters by free-text query across title, description, and location", () => {
    expect(matchesFilters(base, { query: "trailhead" })).toBe(true);
    expect(matchesFilters(base, { query: "swimming pool" })).toBe(false);
  });
});

describe("countSliderSlots", () => {
  function makeProperty(overrides: Partial<Property>): Property {
    return {
      id: "id",
      title: "Property",
      description: "",
      price: 100000,
      propertyType: "House",
      location: "Somewhere",
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: 50,
      imageUrls: [],
      featured: false,
      inHeroSlider: false,
      createdAt: 0,
      ...overrides,
    };
  }

  it("counts properties currently in the hero slider", () => {
    const properties = [
      makeProperty({ id: "1", inHeroSlider: true }),
      makeProperty({ id: "2", inHeroSlider: false }),
      makeProperty({ id: "3", inHeroSlider: true }),
    ];
    expect(countSliderSlots(properties)).toBe(2);
  });

  it("excludes the property being edited from the count", () => {
    const properties = [
      makeProperty({ id: "1", inHeroSlider: true }),
      makeProperty({ id: "2", inHeroSlider: true }),
    ];
    expect(countSliderSlots(properties, "1")).toBe(1);
  });

  it("returns 0 when no properties are in the slider", () => {
    const properties = [makeProperty({ id: "1", inHeroSlider: false })];
    expect(countSliderSlots(properties)).toBe(0);
  });
});

describe("isAllowedImageFile", () => {
  it("accepts a JPEG under the size limit", () => {
    const file = new File([new Uint8Array(1024)], "photo.jpg", { type: "image/jpeg" });
    expect(isAllowedImageFile(file)).toBe(true);
  });

  it("accepts PNG and WebP", () => {
    expect(isAllowedImageFile(new File([], "a.png", { type: "image/png" }))).toBe(true);
    expect(isAllowedImageFile(new File([], "a.webp", { type: "image/webp" }))).toBe(true);
  });

  it("rejects an unsupported file type", () => {
    const file = new File([new Uint8Array(1024)], "doc.pdf", { type: "application/pdf" });
    expect(isAllowedImageFile(file)).toBe(false);
  });

  it("rejects a file over 5MB", () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "huge.jpg", { type: "image/jpeg" });
    expect(isAllowedImageFile(file)).toBe(false);
  });
});

describe("canAddImages", () => {
  it("allows adding up to the 10-image cap", () => {
    expect(canAddImages(new Array(8).fill(""), 2)).toBe(true);
  });

  it("rejects adding past the 10-image cap", () => {
    expect(canAddImages(new Array(8).fill(""), 3)).toBe(false);
  });

  it("allows adding to an empty gallery", () => {
    expect(canAddImages([], 5)).toBe(true);
  });
});

describe("removedImageUrls", () => {
  it("returns urls present in before but not in after", () => {
    const before = ["a.jpg", "b.jpg", "c.jpg"];
    const after = ["a.jpg", "c.jpg"];
    expect(removedImageUrls(before, after)).toEqual(["b.jpg"]);
  });

  it("returns an empty array when nothing was removed", () => {
    const before = ["a.jpg", "b.jpg"];
    const after = ["a.jpg", "b.jpg"];
    expect(removedImageUrls(before, after)).toEqual([]);
  });

  it("returns all urls when everything was removed", () => {
    const before = ["a.jpg", "b.jpg"];
    const after: string[] = [];
    expect(removedImageUrls(before, after)).toEqual(["a.jpg", "b.jpg"]);
  });

  it("returns an empty array when before is already empty", () => {
    expect(removedImageUrls([], ["a.jpg"])).toEqual([]);
  });
});
