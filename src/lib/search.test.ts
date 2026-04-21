import { describe, expect, it, vi } from "vitest";
import type { ProviderClient } from "@/lib/providers/types";
import { orchestrateSearch } from "@/lib/search";

function okProvider(name: ProviderClient["name"]): ProviderClient {
  return {
    name,
    async search(params) {
      return {
        offers: [
          {
            provider: name,
            offerId: `${name}-1`,
            itinerary: {
              origin: params.origin,
              destination: params.destination,
              departDateTime: `${params.departDate}T10:00:00Z`,
              returnDateTime: params.returnDate ? `${params.returnDate}T11:00:00Z` : undefined
            },
            pricing: { total: { currency: "USD", amount: 1000 } }
          }
        ]
      };
    }
  };
}

function failProvider(name: ProviderClient["name"]): ProviderClient {
  return {
    name,
    async search() {
      throw new Error("boom");
    }
  };
}

describe("orchestrateSearch", () => {
  it("succeeds if at least 2 providers succeed", async () => {
    vi.stubEnv("PROVIDER_TIMEOUT_MS", "1000");
    const res = await orchestrateSearch("from Dubai to London December 20-27", {
      providers: [okProvider("sabre"), okProvider("amadeus"), failProvider("hotelbeds")],
      providerTimeoutMs: 1000,
      minSuccessfulProviders: 2
    });
    expect(res.providers.filter((p) => p.ok).length).toBeGreaterThanOrEqual(2);
    expect(res.offers.length).toBeGreaterThan(0);
  });

  it("fails if fewer than 2 providers succeed", async () => {
    await expect(
      orchestrateSearch("from Dubai to London December 20-27", {
        providers: [okProvider("sabre"), failProvider("amadeus"), failProvider("hotelbeds")],
        providerTimeoutMs: 1000,
        minSuccessfulProviders: 2
      })
    ).rejects.toThrow(/insufficient provider responses/i);
  });

  it("applies provider timeout", async () => {
    const slow: ProviderClient = {
      name: "sabre",
      async search(_params, signal) {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, 5000);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(t);
              reject(new Error("aborted"));
            },
            { once: true }
          );
        });
        return { offers: [] };
      }
    };
    await expect(
      orchestrateSearch("from Dubai to London December 20-27", {
        providers: [slow, okProvider("amadeus"), okProvider("hotelbeds")],
        providerTimeoutMs: 50,
        minSuccessfulProviders: 2
      })
    ).resolves.toBeDefined();
  });
});

