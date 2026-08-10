import { describe, expect, it } from "vitest";
import { calculateReadinessScore, classifyLeadTemperature } from "@/lib/lead-scoring";

describe("calculateReadinessScore", () => {
  it("scores maximum-intent answers at the ceiling (40 + 30 + 15 + 10)", () => {
    const score = calculateReadinessScore({
      timeframe: "Inmediato (Menos de 1 mes)",
      budgetRange: "Más de $2,500,000 USD",
      propertyUsage: "Vivienda permanente (Todo el año)",
      preferredAreas: ["Playa Mansa"],
    });
    expect(score).toBe(95);
  });

  it("scores an exploratory, no-areas-selected lead at its floor", () => {
    const score = calculateReadinessScore({
      timeframe: "Exploratorio / Sin prisa definida",
      budgetRange: "Menos de $500,000 USD",
      propertyUsage: "Otro",
      preferredAreas: [],
    });
    expect(score).toBe(20);
  });

  it("adds the preferred-areas bonus only when at least one area is selected", () => {
    const base = {
      timeframe: "A mediano plazo (3 a 6 meses)" as const,
      budgetRange: "$500,000 - $1,000,000 USD" as const,
      propertyUsage: "Residencia de descanso / Recreación" as const,
    };
    const withAreas = calculateReadinessScore({ ...base, preferredAreas: ["La Barra"] });
    const withoutAreas = calculateReadinessScore({ ...base, preferredAreas: [] });
    expect(withAreas - withoutAreas).toBe(10);
  });
});

describe("classifyLeadTemperature", () => {
  it("classifies immediate timeframe + preferred areas as hot", () => {
    const temperature = classifyLeadTemperature({
      timeframe: "Inmediato (Menos de 1 mes)",
      budgetRange: "Menos de $500,000 USD",
      propertyUsage: "Otro",
      preferredAreas: ["Manantiales"],
    });
    expect(temperature).toBe("hot");
  });

  it("classifies immediate timeframe with no preferred areas as warm", () => {
    const temperature = classifyLeadTemperature({
      timeframe: "Inmediato (Menos de 1 mes)",
      budgetRange: "Menos de $500,000 USD",
      propertyUsage: "Otro",
      preferredAreas: [],
    });
    expect(temperature).toBe("warm");
  });

  it("classifies a non-immediate timeframe as warm even with matching criteria", () => {
    const temperature = classifyLeadTemperature({
      timeframe: "A corto plazo (1 a 3 meses)",
      budgetRange: "Más de $2,500,000 USD",
      propertyUsage: "Vivienda permanente (Todo el año)",
      preferredAreas: ["José Ignacio", "La Barra"],
    });
    expect(temperature).toBe("warm");
  });
});
