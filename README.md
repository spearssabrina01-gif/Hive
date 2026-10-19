# Amazon Hive

**Amazon "Build, Ship, Shape" (4 for All) hackathon entry — primary track: Ring**
(priority: access control, caretaking).

## The concept — an ambient-intelligence hub

Hive turns four Amazon surfaces into one proactive partner for the home.
Instead of four gadgets reacting in isolation, each plays a role:

- **Bee captures the context** — the *who* and the day's mental load
  (expected visitors, reminders, memories)
- **Ring is the sensory perimeter** — the *when* (a person at the door)
- **Alexa+ is the routing brain** — speaks when speaking helps, stays
  silent when it doesn't
- **Fire TV is the visual surface** — shows the door full-screen, as a
  quiet picture-in-picture, or as the day-at-a-glance dashboard
- **Bee remembers** — every visit lands in the day's notes

### The 5-step connected story

1. **Bee hears** Sabrina say *"I'm expecting the cleaner at 3"* → logs the expected visit
2. **Ring detects** a person at the door (human motion / doorbell press)
3. **Alexa+ announces** *"Your cleaner is here"*
4. **Fire TV pops up** the live door camera feed
5. **Bee logs** the visit in the day's notes

One continuous story across four Amazon surfaces — Bee knows the *who*,
Ring sees the *when*, Alexa+ speaks, Fire TV shows, Bee remembers.

### Hive feature: Brain Dump Dashboard

Say *"show my brain dump"* and Fire TV pulls up the whole day on one
screen: Bee's captured list (expected visits with waiting/arrived status,
plus Bee's notes) alongside the day's Ring security events — prioritized,
with waiting visitors first. The hub composes it on demand from the same
expected-visitors and day-notes stores the 5-step story already uses
(`GET /api/brain-dump`); there is no separate dashboard database.

### Hive feature: Focus Mode

Tap Bee and the home goes into focus. Ring still watches the door, but a
person at the door no longer triggers the Alexa+ audio announcement —
Fire TV shows a quiet picture-in-picture of the door instead, and Bee
still logs the visit. Tap again and the announced 5-step flow returns.
Focus state lives in the hub (`POST /api/demo/focus`), so every surface
agrees on it.

## Quickstart

```bash
npm install
npm start        # hub + demo UI at http://localhost:3000
npm test         # integration tests (boots its own server on :3101)
```

Open the demo page, then walk the story top to bottom:
**Run step 1** (Bee hears the utterance) → **Run step 2** (Ring sees a person).
Steps 3–5 fire automatically through the hub. Use **"Connect Alexa+ (real MCP
client)"** to watch the full MCP handshake (initialize → tools/list →
tools/call) in the inspector panel. Then try the Hive cards: **Tap Bee**
(Focus Mode) + **Run step 2** again to feel the quiet path, and
**Show my brain dump** for the Fire TV dashboard.

## Real vs simulated in v1 (honest truth boundary)

| Track | Real in v1 | Simulated in v1 |
|---|---|---|
| Ring | webhook receiver w/ HMAC verification, official payload shapes, official endpoint URLs in code | event source (mock POSTs documented payloads); no credentials yet |
| Alexa+ | MCP server 2025-11-25 Streamable HTTP, actually invoked | Alexa+ device experience (Echo-style web UI) |
| Fire TV | overlay + dashboard page source (Vega-ready HTML) | running on-device (panels in demo page; .vpkg later) |
| Bee | adapter interface + sim implementing exact data shapes | live data (device arrives next week; one-line config swap) |
| Hive hub logic | Focus Mode routing (announce vs quiet PiP) and Brain Dump composition run for real in the hub, over the real stores | the devices they steer are the simulated ones above |

Every simulated element is labeled **SIMULATED** in the UI and docs. We never
present mock data as real.

## Honesty notes the judges should know

- **Ring:** familiar-face recognition is NOT in the Ring Partner API — we do
  not fake a face-ID endpoint. Bee holds the "who" (expected visitor), Ring
  supplies the "when" (human at door). We use no community reverse-engineered
  libs; the official API has no SDK, so it's plain HTTP.
- **Alexa+:** real MCP add-ons are client-initiated (servers can't receive
  pushes). Our hub drives the simulated client against the real MCP server —
  exactly what the rules' simulated-experience path allows. Simulation source
  is in `web/app.js`.
- **Bee:** there is no verified write path to Bee daily notes, so "log the
  visit" = `complete_reminder` + `log_memory`; the demo narrates that Bee's
  memory flows into her daily summary.
- **Focus Mode:** the "tap" is a demo button (`POST /api/demo/focus`) and
  Focus state is held in hub memory, not on a device — the routing behavior
  it drives (no `announce_visitor` call, PiP overlay, visit still logged)
  is real hub logic.

## Repo layout

```
├── hub/        # express hub: server.js, ring-webhook.js (HMAC), event-hub.js (story + Hive focus/brain-dump), mock-ring.js
├── mcp/        # REAL MCP server (2025-11-25 Streamable HTTP) + 3 Alexa+ tools
├── bee/        # BeeAdapter interface; sim (active) and live CLI (NOT ACTIVE until device arrives)
├── web/        # demo UI: 5 step cards, Hive Focus Mode + Brain Dump cards, Echo-style banner, real MCP client + inspector, Fire TV panels, day notes
├── firetv/     # Vega-ready visitor overlay (full-screen + quiet PiP) and Brain Dump dashboard + .vpkg build notes
├── docs/       # per-track research, architecture, build plan
├── data/       # runtime JSON (gitignored)
└── tests/      # plain-node HTTP integration tests
```

## Submission checklist

- [x] GitHub repo with real code calling the tech (imports/entry points, not README mentions)
- [ ] Text description (M5)
- [ ] Under-3-min demo video (M5)
- [ ] Product feedback for every tool/API used (M5)
- [ ] DevPost submission — Sabrina, needs her DevPost account. Deadline **Oct 23, 2026**

## What's next

See [docs/build-plan.md](docs/build-plan.md) (M1–M6): Ring Early Access
credentials → Vega `.vpkg` on a KVM machine → Bee device (`bee login`, flip
`bee.mode` to `live`) → video + GitHub + DevPost.

Everything is free-tier and local in v1: no accounts, no credentials, no
submissions, no public repos.
