import crypto from "node:crypto";
import type { ProviderClient } from "@/lib/providers/types";
import { parseNaturalLanguageQuery } from "@/lib/llm";
import type { SearchResponse, UnifiedFlightOffer } from "@/lib/schemas";
import { withLatency, withTimeout } from "@/lib/time";

export type OrchestratorOptions = {
  providers: ProviderClient[];
  providerTimeoutMs?: number;
  minSuccessfulProviders?: number;
  requestId?: string;
};

export async function orchestrateSearch(
  query: string,
  opts: OrchestratorOptions
): Promise<SearchResponse> {
  const requestId = opts.requestId ?? crypto.randomUUID();
  const started = Date.now();

  const parsed = await parseNaturalLanguageQuery(query);

  const providerTimeoutMs = opts.providerTimeoutMs ?? Number(process.env.PROVIDER_TIMEOUT_MS ?? "1200");
  const minSuccessful = opts.minSuccessfulProviders ?? 2;

  const providerRuns = opts.providers.map(async (p) => {
    const latencyMs = { value: 0 };
    try {
      const result = await withLatency(
        async () =>
          withTimeout(async (signal) => {
            return await p.search(parsed, signal);
          }, providerTimeoutMs),
        latencyMs
      );
      return {
        name: p.name,
        ok: true as const,
        latencyMs: latencyMs.value,
        offers: result.offers
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      return {
        name: p.name,
        ok: false as const,
        latencyMs: latencyMs.value,
        error: message,
        offers: [] as UnifiedFlightOffer[]
      };
    }
  });

  const settled = await Promise.all(providerRuns);
  const okProviders = settled.filter((r) => r.ok);

  if (okProviders.length < minSuccessful) {
    const totalMs = Date.now() - started;
    const providers = settled.map(({ name, ok, latencyMs, error }) => ({ name, ok, latencyMs, error }));
    const error = new Error("insufficient provider responses");
    (error as any).code = "PROVIDERS_UNAVAILABLE";
    (error as any).details = { requestId, providers, totalMs };
    throw error;
  }

  const offers = okProviders.flatMap((r) => r.offers);

  // Lightweight ranking: cheapest first (ties stable)
  offers.sort((a, b) => a.pricing.total.amount - b.pricing.total.amount);

  const totalMs = Date.now() - started;

  return {
    requestId,
    parsed,
    offers,
    providers: settled.map(({ name, ok, latencyMs, error }) => ({ name, ok, latencyMs, error })),
    timing: { totalMs }
  };
}

