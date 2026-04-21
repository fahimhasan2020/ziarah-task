## Ziarah Flight Search Service — Design

### Goals & Non-goals
- **Goals**: Parse natural language → structured search params; call 3 providers in parallel; normalize; **p95 < 3s**; tolerate provider failures (need **≥2/3**); production-ready for high concurrency.
- **Non-goals**: Real GDS integrations, full fare rules, caching strategy beyond basic recommendations, payments/booking.

### Architecture (logical)
```mermaid
flowchart LR
  U[Client] -->|POST /api/search| API[Next.js API Route]
  API -->|parse| LLM[LLM Parse Layer]
  API -->|fan-out (parallel)| P1[Provider: Sabre (mock)]
  API -->|fan-out (parallel)| P2[Provider: Amadeus (mock)]
  API -->|fan-out (parallel)| P3[Provider: HotelBeds-style (mock)]
  P1 --> API
  P2 --> API
  P3 --> API
  API -->|normalize + rank| U
```

### Service boundaries
- **Single service** for this scope: orchestration + normalization + provider clients. This minimizes network hops and tail latency and keeps operational overhead low for the assignment.
- In a real system, consider splitting:
  - **Provider adapters** as separate services only if you need independent scaling/release cadence, strict isolation, or different SLAs per integration.
  - **LLM parsing** could be isolated for model governance/cost controls, but typically remains a library behind a stable interface.

### API contract
#### Request
- **POST** `/api/search`

Body:
- `query` (string, required): natural language query
- `requestId` (string, optional): client-provided correlation id (server still generates its own)

Example:
```json
{ "query": "family of 4 from Dubai to London, December 20-27, budget $3000" }
```

#### Response (200)
Body:
- `requestId` (string): server request id
- `parsed`: structured search parameters
- `offers[]`: normalized flight offers
- `providers[]`: per-provider success/latency/error
- `timing.totalMs`: end-to-end timing

#### Errors
- **400**: validation/parsing failures
- **503**: fewer than 2 providers succeed (degraded response not allowed)
- **500**: unexpected server error

### Failure handling strategy
- **Parallel fan-out** to reduce tail latency.
- **Per-provider timeout** (default 1200ms) so slow providers don’t dominate p95.
- **Degraded success rule**: require **≥2/3** providers to return successfully; otherwise fail with 503.
- **Retries**: not enabled for mocks. In production, use bounded retries for idempotent search calls with jitter and budgets (e.g., max 1 retry, only on 5xx/timeouts).
- **Circuit breakers**: recommended per provider (e.g., open after N failures in window, half-open probe). For Node, a library like `opossum` is common; keep the interface the same so it can be added without changing API.

### Observability
- **Logs** (structured): request id, provider outcomes, latencies, totalMs; redact sensitive headers.
- **Metrics**:
  - Request rate, p50/p95/p99 latency, error rates by status code
  - Provider success rate, provider latency histograms, timeout counts
  - “insufficient provider responses” count
- **Tracing**: single trace per request; spans for parse + each provider call; propagate `traceparent` and request ids.

### Deployment & scaling (Kubernetes)
- **Workload**: stateless Next.js container (API routes) behind a Service + Ingress/ALB.
- **Horizontal scaling**: HPA on CPU + request rate (via KEDA/Prometheus adapter). With 10k concurrent users, ensure:
  - Node runtime has adequate `--max-old-space-size`
  - Keep provider calls async and avoid blocking work
  - Use connection pooling/keep-alives for real upstream HTTP clients
- **Readiness/Liveness**:
  - Liveness: `/api/health`
  - Readiness: can be same for this assignment; in production, include dependency health if needed.
- **Config**: env vars (12-factor). No secrets in images; inject via Secret/SSM/ExternalSecrets.
- **Rollouts**: canary or blue/green; keep timeouts/circuit breaker knobs configurable per env.

