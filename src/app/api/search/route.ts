import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { SearchRequestSchema } from "@/lib/schemas";
import { getProviders } from "@/lib/providers";
import { orchestrateSearch } from "@/lib/search";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  const started = Date.now();

  try {
    const json = await req.json();
    const body = SearchRequestSchema.parse(json);
    const requestId = body.requestId ?? crypto.randomUUID();

    const response = await orchestrateSearch(body.query, {
      providers: getProviders(),
      providerTimeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS ?? "1200"),
      minSuccessfulProviders: 2,
      requestId
    });

    logger.info({
      msg: "search.ok",
      requestId,
      totalMs: Date.now() - started,
      providers: response.providers
    });

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    const maybeAny = err as any;
    const requestId = maybeAny?.details?.requestId ?? crypto.randomUUID();

    const status =
      maybeAny?.code === "PROVIDERS_UNAVAILABLE"
        ? 503
        : message.toLowerCase().includes("zod")
          ? 400
          : 500;

    logger.warn({
      msg: "search.error",
      requestId,
      status,
      totalMs: Date.now() - started,
      error: message,
      details: maybeAny?.details
    });

    return NextResponse.json(
      {
        ok: false,
        requestId,
        error: message,
        details: maybeAny?.details
      },
      { status }
    );
  }
}

