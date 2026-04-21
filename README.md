## Ziarah Flight Search Service (Assignment)

Next.js + TypeScript orchestration service that:
- Parses natural-language flight queries into structured parameters (mock “LLM” layer)
- Calls 3 mocked providers in parallel (latency + random failures)
- Normalizes results into a unified response
- Enforces “**at least 2/3 providers must succeed**” for a valid response

### Endpoints
- **POST** `/api/search`
- **GET** `/api/health`

### Local run (without Docker)
```bash
npm install
npm run dev
```

Example request:
```bash
curl -sS -X POST "http://localhost:3000/api/search" \
  -H "content-type: application/json" \
  -d '{"query":"family of 4 from Dubai to London, December 20-27, budget $3000"}' | jq
```

### Run with Docker Compose
```bash
docker compose up --build
```

### Tests
```bash
npm test
```

### Configuration knobs
- **`PROVIDER_TIMEOUT_MS`**: per-provider timeout budget (default `1200`)
- **`PROVIDER_FAILURE_RATE`**: simulated provider failure rate (default `0.2`)
- **`SABRE_LATENCY_MS`**, **`AMADEUS_LATENCY_MS`**, **`HOTELBEDS_LATENCY_MS`**: base mock latencies
- **`LOG_LEVEL`**: `debug|info|warn|error`

### Trade-offs
- **Mock LLM parsing**: implemented as a deterministic parser to keep latency predictable and tests stable; interface is designed so you can swap in a real OpenAI/Claude call.
- **No circuit breaker library wired in**: timeouts + degraded-success rule handle the assignment requirements; the design doc explains how to add breakers/retries without changing the surface area.
- **Simple ranking**: offers sorted by total price; real ranking would incorporate duration, stops, airline, baggage, etc.

### With more time
- Add provider-specific adapters with schema validation on ingress/egress
- Add OpenTelemetry tracing + Prometheus metrics
- Add in-memory cache for hot searches (bounded + TTL) and request coalescing
- Add circuit breakers + retry budgets + hedged requests for worst tail mitigation
- Add load test harness (k6) and tune timeouts for p95 targets

### Design document
See `docs/design.md`.

