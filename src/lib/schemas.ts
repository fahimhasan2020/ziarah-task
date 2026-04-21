import { z } from "zod";

export const MoneySchema = z.object({
  currency: z.string().min(1).default("USD"),
  amount: z.number().nonnegative()
});
export type Money = z.infer<typeof MoneySchema>;

export const SearchRequestSchema = z.object({
  query: z.string().min(1),
  requestId: z.string().min(1).optional()
});
export type SearchRequest = z.infer<typeof SearchRequestSchema>;

export const SearchParamsSchema = z.object({
  origin: z.string().min(3),
  destination: z.string().min(3),
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  passengers: z.number().int().positive().max(9).default(1),
  budget: MoneySchema.optional()
});
export type SearchParams = z.infer<typeof SearchParamsSchema>;

export const UnifiedFlightOfferSchema = z.object({
  provider: z.string().min(1),
  offerId: z.string().min(1),
  itinerary: z.object({
    origin: z.string().min(3),
    destination: z.string().min(3),
    departDateTime: z.string().min(1),
    returnDateTime: z.string().min(1).optional()
  }),
  pricing: z.object({
    total: MoneySchema,
    perPassenger: MoneySchema.optional()
  }),
  meta: z.record(z.unknown()).optional()
});
export type UnifiedFlightOffer = z.infer<typeof UnifiedFlightOfferSchema>;

export const SearchResponseSchema = z.object({
  requestId: z.string().min(1),
  parsed: SearchParamsSchema,
  offers: z.array(UnifiedFlightOfferSchema),
  providers: z.array(
    z.object({
      name: z.string().min(1),
      ok: z.boolean(),
      latencyMs: z.number().int().nonnegative(),
      error: z.string().optional()
    })
  ),
  timing: z.object({
    totalMs: z.number().int().nonnegative()
  })
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

