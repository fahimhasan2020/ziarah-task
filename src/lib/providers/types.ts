import type { SearchParams, UnifiedFlightOffer } from "@/lib/schemas";

export type ProviderName = "sabre" | "amadeus" | "hotelbeds";

export type ProviderResult = {
  offers: UnifiedFlightOffer[];
};

export type ProviderClient = {
  name: ProviderName;
  search: (params: SearchParams, signal: AbortSignal) => Promise<ProviderResult>;
};

