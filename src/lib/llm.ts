import { SearchParamsSchema, type SearchParams } from "@/lib/schemas";

function toIsoDate(date: Date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseBudget(raw: string): { currency: string; amount: number } | undefined {
  const m = raw.match(/\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)/);
  if (!m) return undefined;
  const amount = Number(m[1].replaceAll(",", ""));
  if (!Number.isFinite(amount)) return undefined;
  return { currency: "USD", amount };
}

/**
 * Deterministic "LLM-like" parser (default). In production you’d call an LLM here;
 * for this assignment we keep it mockable, fast, and testable.
 */
export async function parseNaturalLanguageQuery(query: string): Promise<SearchParams> {
  // Basic "from X to Y" extraction
  const fromTo =
    query.match(/\bfrom\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:,|\b|$)/i) ??
    query.match(/\b([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:,|\b|$)/i);

  const origin = (fromTo?.[1] ?? "Dubai").trim();
  const destination = (fromTo?.[2] ?? "London").trim();

  // Passenger count (e.g. "family of 4", "4 passengers")
  const paxMatch = query.match(/\bfamily\s+of\s+(\d+)\b/i) ?? query.match(/\b(\d+)\s+passengers?\b/i);
  const passengers = paxMatch ? Number(paxMatch[1]) : 1;

  // Date range: "December 20-27" (assume current year, adjust if already past)
  const range = query.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\s*-\s*(\d{1,2})\b/i
  );
  const single = query.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i
  );
  const monthIndex = (m: string) =>
    [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december"
    ].indexOf(m.toLowerCase());

  const now = new Date();
  const baseYear = now.getUTCFullYear();

  let departDate = toIsoDate(now);
  let returnDate: string | undefined;

  if (range) {
    const mi = monthIndex(range[1]);
    const d1 = Number(range[2]);
    const d2 = Number(range[3]);
    const dep = new Date(Date.UTC(baseYear, mi, d1));
    const ret = new Date(Date.UTC(baseYear, mi, d2));
    // If the departure is in the past, roll to next year (simple heuristic)
    if (dep.getTime() < now.getTime() - 24 * 3600 * 1000) {
      dep.setUTCFullYear(baseYear + 1);
      ret.setUTCFullYear(baseYear + 1);
    }
    departDate = toIsoDate(dep);
    returnDate = toIsoDate(ret);
  } else if (single) {
    const mi = monthIndex(single[1]);
    const d1 = Number(single[2]);
    const dep = new Date(Date.UTC(baseYear, mi, d1));
    if (dep.getTime() < now.getTime() - 24 * 3600 * 1000) dep.setUTCFullYear(baseYear + 1);
    departDate = toIsoDate(dep);
  }

  const budgetMatch = query.match(/\bbudget\s+([^,]+)\b/i);
  const budget = budgetMatch ? parseBudget(budgetMatch[1]) : undefined;

  return SearchParamsSchema.parse({
    origin,
    destination,
    departDate,
    returnDate,
    passengers,
    budget
  });
}

