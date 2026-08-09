import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { formatPrice, mapDocToProperty, matchesFilters } from "@/lib/properties";
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
      imageUrl: "https://example.com/house.jpg",
      featured: true,
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
      imageUrl: "https://example.com/house.jpg",
      featured: true,
      createdAt: 1700000000000,
    });
  });

  it("fills in safe defaults for missing fields", () => {
    const property = mapDocToProperty("xyz", {});
    expect(property.title).toBe("");
    expect(property.price).toBe(0);
    expect(property.propertyType).toBe("House");
    expect(property.featured).toBe(false);
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
    imageUrl: "",
    featured: true,
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
