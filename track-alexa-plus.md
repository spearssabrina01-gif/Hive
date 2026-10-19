# Track: Alexa+

Hybrid pattern (proven by a submitted entry, "BorrowBack"):

## 1. REAL MCP server (what we built)

- Spec **2025-11-25**, **Streamable HTTP**, served at `POST /api/mcp` on the
  same origin as the demo web app (`hub/server.js` + `mcp/`).
- Official SDK: `@modelcontextprotocol/sdk`, stateless mode
  (`sessionIdGenerator: undefined`, `enableJsonResponse: true`), `zod` for
  schemas, `express` for HTTP.
- Tools (`mcp/tools.js`):
  - `get_expected_visitors({})` → list of `{name, expected_at}`
  - `announce_visitor({visitor_name, confidence, expected})` → `{announcement_text}`
  - `log_visit({visitor_name, timestamp, notes?})` → `{logged: true}`

## 2. Simulated Alexa+ web experience (what the demo page shows)

- Echo-style UI in `web/index.html` that is a **real MCP client**: it performs
  `initialize → notifications/initialized → tools/list → tools/call` against
  `/api/mcp` (`web/app.js`) and renders the result.
- An **MCP inspector** panel shows the raw JSON-RPC request/response.
- Speech via the browser's `speechSynthesis` ("Your cleaner is here") —
  because the real device isn't here.

## Honesty note

Real MCP add-ons are **client-initiated** — servers can't receive pushes. Our
hub drives the simulated client (the hub calls `announce_visitor` and the web
experience renders + speaks it), which is exactly what the hackathon rules'
simulated-experience path allows. The repo includes the simulation source, as
required.
