# Architecture — Amazon Hive

Central Node/Express hub (`hub/server.js`) orchestrates everything.

```
Bee(sim) ──utterance──▶ hub ──expected visit──▶ data/expected-visitors.json
Ring(mock webhook) ──person_detected──▶ hub ──match──▶ door_visitor event
hub ──tools/call announce_visitor──▶ MCP /api/mcp ──▶ web UI (Echo banner + speech + inspector panel)
hub ──visitor_overlay event──▶ Fire TV panel (v1 simulated)
hub ──log_visit──▶ MCP tool + Bee log_memory/complete_reminder ──▶ day's notes panel

Hive extras (same hub, same stores):
tap Bee ──POST /api/demo/focus──▶ hub focus state ──focus_mode event──▶ all surfaces
  focus ON + door event: NO announce_visitor call ──▶ announcement_suppressed event;
  visitor_overlay mode:'pip' ──▶ Fire TV quiet picture-in-picture; log_visit unchanged
"show my brain dump" ──POST /api/demo/brain-dump──▶ hub.getBrainDump()
  composes expected-visitors + day-notes stores (prioritized) ──▶ brain_dump event
  ──▶ firetv/dashboard.html (also reads GET /api/brain-dump directly)
```

## Module contracts

| Module | Role | Contracts |
|---|---|---|
| `hub/server.js` | Express hub | Serves web UI; `POST /api/mcp` (real MCP); `POST /webhook/ring` (HMAC-verified); demo + SSE APIs; Hive: `GET /api/brain-dump`, `POST /api/demo/focus`, `POST /api/demo/brain-dump`; `GET /api/state` includes `focus_mode` |
| `hub/ring-webhook.js` | Ring receiver | HMAC-SHA256 (timing-safe) verify of raw body vs `X-Signature` **before** JSON parse; parses `motion_detected`/`human` and `button_press` → normalized door event; 200 within 5s |
| `hub/event-hub.js` | Story router + Hive logic | `handleUtterance` (pattern → Bee reminder/memory → expected-visitors store); `handleDoorEvent` (match → MCP announce → overlay event → MCP log + Bee log → day notes); `focus` (in-memory Focus Mode: when on, no announce call + `announcement_suppressed`, overlay `mode:'pip'`, logging unchanged); `getBrainDump()` (prioritized composition of the two stores); SSE broadcast |
| `hub/mock-ring.js` | Simulated Ring source | POSTs documented official-shape payloads with valid HMAC; also runnable via `POST /api/demo/ring-human` |
| `mcp/server.js` | Real MCP server | 2025-11-25 Streamable HTTP, stateless, per-request server+transport |
| `mcp/tools.js` | Alexa+ tools | `get_expected_visitors`, `announce_visitor`, `log_visit` (zod schemas) |
| `bee/adapter.js` | Bee interface | `BeeAdapter` base class + `getBeeAdapter(config)` mode switch |
| `bee/sim.js` | Simulated Bee | Same data shapes as the real CLI; seeded utterances/facts/todos/day summary |
| `bee/live.js` | Real CLI adapter | Stubbed real commands — **NOT ACTIVE** until device arrives |
| `web/` | Demo UI | 5 step cards w/ Run buttons; Hive Focus Mode card (tap-Bee toggle) + Brain Dump card; Echo-style banner + real MCP client + inspector; Fire TV panels; day-notes panel |
| `firetv/overlay.html` | Vega-ready overlay | Full-screen visitor overlay; `?pip=1` → quiet picture-in-picture (Focus Mode); Dismiss button |
| `firetv/dashboard.html` | Vega-ready dashboard | Hive Brain Dump: expected visits + Ring events + Bee notes from `GET /api/brain-dump` |
| `data/` | Runtime JSON | `expected-visitors.json`, `day-notes.json` (gitignored except `.gitkeep`) |

## Event flow (SSE)

The demo UI subscribes to `GET /api/events` and renders: `expected_visit_logged`,
`door_event`, `announcement` (banner + speech), `visitor_overlay` (Fire TV
iframe; `mode: 'pip'` renders the quiet picture-in-picture), `visit_logged`
(day notes refresh). Hive adds: `focus_mode` (toggle button state + log),
`announcement_suppressed` (muted banner, no speech), `brain_dump` (loads the
Fire TV dashboard iframe + summary log).

## Real vs simulated in v1 (honest truth boundary)

| Track | Real in v1 | Simulated in v1 |
|---|---|---|
| Ring | webhook receiver w/ HMAC verification, official payload shapes, official endpoint URLs in code | event source (mock POSTs documented payloads); no credentials yet |
| Alexa+ | MCP server 2025-11-25 Streamable HTTP, actually invoked | Alexa+ device experience (Echo-style web UI) |
| Fire TV | overlay + dashboard page source (Vega-ready HTML) | running on-device (panel in demo page; .vpkg later) |
| Bee | adapter interface + sim implementing exact data shapes | live data (device arrives next week; one-line config swap) |
| Hive hub logic | Focus Mode routing + Brain Dump composition, real in the hub over the real stores | the tap-Bee input and the devices steered are simulated |
