import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { calculateResponseRate, countNewLeadsSince, mapDocToLead } from "@/lib/lead-utils";
import type { Lead } from "@/lib/types";

describe("mapDocToLead", () => {
  it("maps a Firestore document into a Lead, converting the timestamp to millis", () => {
    const createdAt = Timestamp.fromMillis(1700000000000);
    const lead = mapDocToLead("lead1", {
      propertyId: "prop1",
      propertyTitle: "Hillside Cottage",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
      message: "Interested in a viewing.",
      status: "new",
      createdAt,
    });

    expect(lead).toEqual({
      id: "lead1",
      propertyId: "prop1",
      propertyTitle: "Hillside Cottage",
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-1234",
      message: "Interested in a viewing.",
      status: "new",
      createdAt: 1700000000000,
    });
  });

  it("fills in safe defaults for missing fields", () => {
    const lead = mapDocToLead("lead2", {});
    expect(lead.name).toBe("");
    expect(lead.status).toBe("new");
  });
});

describe("calculateResponseRate", () => {
  function makeLead(overrides: Partial<Lead>): Lead {
    return {
      id: "id",
      propertyId: "prop",
      propertyTitle: "Property",
      name: "Name",
      email: "email@example.com",
      phone: "",
      message: "",
      status: "new",
      createdAt: 0,
      ...overrides,
    };
  }

  it("returns 0 when there are no leads", () => {
    expect(calculateResponseRate([])).toBe(0);
  });

  it("returns 0 when every lead is still new", () => {
    const leads = [makeLead({ status: "new" }), makeLead({ status: "new" })];
    expect(calculateResponseRate(leads)).toBe(0);
  });

  it("returns 100 when every lead has been responded to", () => {
    const leads = [makeLead({ status: "contacted" }), makeLead({ status: "closed" })];
    expect(calculateResponseRate(leads)).toBe(100);
  });

  it("returns the rounded percentage for a mixed set", () => {
    const leads = [makeLead({ status: "new" }), makeLead({ status: "contacted" }), makeLead({ status: "closed" })];
    expect(calculateResponseRate(leads)).toBe(67);
  });
});

describe("countNewLeadsSince", () => {
  function makeLead(createdAt: number): Lead {
    return {
      id: "id",
      propertyId: "prop",
      propertyTitle: "Property",
      name: "Name",
      email: "email@example.com",
      phone: "",
      message: "",
      status: "new",
      createdAt,
    };
  }

  it("counts leads created at or after the cutoff", () => {
    const leads = [makeLead(1000), makeLead(2000), makeLead(3000)];
    expect(countNewLeadsSince(leads, 2000)).toBe(2);
  });

  it("excludes leads created before the cutoff", () => {
    expect(countNewLeadsSince([makeLead(500)], 1000)).toBe(0);
  });

  it("returns 0 for an empty list", () => {
    expect(countNewLeadsSince([], 0)).toBe(0);
  });
});
