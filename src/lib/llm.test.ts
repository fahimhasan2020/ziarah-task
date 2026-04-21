import { describe, expect, it } from "vitest";
import { parseNaturalLanguageQuery } from "@/lib/llm";

describe("parseNaturalLanguageQuery", () => {
  it("parses sample query into structured params", async () => {
    const q = "family of 4 from Dubai to London, December 20-27, budget $3000";
    const params = await parseNaturalLanguageQuery(q);

    expect(params.origin.toLowerCase()).toContain("dubai");
    expect(params.destination.toLowerCase()).toContain("london");
    expect(params.passengers).toBe(4);
    expect(params.departDate).toMatch(/^\d{4}-12-20$/);
    expect(params.returnDate).toMatch(/^\d{4}-12-27$/);
    expect(params.budget?.amount).toBe(3000);
    expect(params.budget?.currency).toBe("USD");
  });
});

