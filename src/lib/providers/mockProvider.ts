import type { Money, SearchParams, UnifiedFlightOffer } from "@/lib/schemas";
import { sleep } from "@/lib/time";
import type { ProviderClient, ProviderName, ProviderResult } from "@/lib/providers/types";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function jitter(baseMs: number, jitterPct: number) {
  const delta = baseMs * jitterPct;
  return Math.max(0, Math.round(baseMs + (Math.random() * 2 - 1) * delta));
}

function money(amount: number, currency = "USD"): Money {
  return { currency, amount: Math.round(amount * 100) / 100 };
}

function buildOffer(
  provider: ProviderName,
  params: SearchParams,
  idx: number,
  total: Money
): UnifiedFlightOffer {
  const depTime = `${params.departDate}T${String(randInt(6, 22)).padStart(2, "0")}:00:00Z`;
  const retTime = params.returnDate
    ? `${params.returnDate}T${String(randInt(6, 22)).padStart(2, "0")}:00:00Z`
    : undefined;
  return {
    provider,
    offerId: `${provider}-${params.origin}-${params.destination}-${idx}-${randInt(1000, 9999)}`,
    itinerary: {
      origin: params.origin,
      destination: params.destination,
      departDateTime: depTime,
      returnDateTime: retTime
    },
    pricing: {
      total,
      perPassenger: money(total.amount / params.passengers, total.currency)
    },
    meta: {
      cabin: Math.random() < 0.85 ? "ECONOMY" : "PREMIUM_ECONOMY",
      stops: Math.random() < 0.7 ? 0 : 1
    }
  };
}

export function makeMockProviderClient(opts: {
  name: ProviderName;
  baseLatencyMs: number;
  failureRate: number; // 0..1
}): ProviderClient {
  return {
    name: opts.name,
    async search(params: SearchParams, signal: AbortSignal): Promise<ProviderResult> {
      const latency = jitter(opts.baseLatencyMs, 0.35);
      await sleep(latency, signal);

      if (Math.random() < opts.failureRate) {
        throw new Error(`${opts.name} upstream error`);
      }

      const basePrice = randInt(450, 1200) * params.passengers;
      const multiplier = opts.name === "sabre" ? 1.0 : opts.name === "amadeus" ? 0.97 : 1.03;
      const offers = Array.from({ length: randInt(3, 6) }).map((_, i) =>
        buildOffer(opts.name, params, i + 1, money(basePrice * multiplier * (1 + i * 0.04)))
      );

      return { offers };
    }
  };
}

