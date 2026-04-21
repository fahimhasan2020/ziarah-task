import { makeMockProviderClient } from "@/lib/providers/mockProvider";
import type { ProviderClient } from "@/lib/providers/types";

export function getProviders(): ProviderClient[] {
  // Latency/failure knobs are env-controlled so you can tune p95 behavior.
  const failureRate = Number(process.env.PROVIDER_FAILURE_RATE ?? "0.2");
  return [
    makeMockProviderClient({
      name: "sabre",
      baseLatencyMs: Number(process.env.SABRE_LATENCY_MS ?? "650"),
      failureRate
    }),
    makeMockProviderClient({
      name: "amadeus",
      baseLatencyMs: Number(process.env.AMADEUS_LATENCY_MS ?? "700"),
      failureRate
    }),
    makeMockProviderClient({
      name: "hotelbeds",
      baseLatencyMs: Number(process.env.HOTELBEDS_LATENCY_MS ?? "800"),
      failureRate
    })
  ];
}

