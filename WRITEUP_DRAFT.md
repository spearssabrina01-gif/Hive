# Amazon Hive

**Build, Ship, Shape: Amazon Developer Hackathon — Primary track: Ring**
(priority categories: access control, caretaking)

> One continuous story across four Amazon surfaces: Bee knows the *who*,
> Ring sees the *when*, Alexa+ speaks, Fire TV shows, Bee remembers.

---

## The problem

A doorbell tells you *someone* is there. It can't tell you whether it's the
person you were expecting — and for a lot of people, that gap is the whole
problem.

If you're expecting a cleaner, a caregiver, a home-health nurse, or a family
member, "motion at your front door" isn't enough. You have to get up, find
your phone, open an app, and squint at a camera feed — every time, expected
or not. For people with limited mobility, people providing or receiving care,
and anyone whose hands are simply full, the front door is the least
accessible part of the smart home.

The information needed to fix this already exists, scattered across devices:
your wearable heard you say *"I'm expecting the cleaner at 3."* Your doorbell
can see a person arrive. Your TV is the biggest screen in the house. But no
single product connects those moments into one calm, glanceable answer:
**"Your cleaner is here."**

## The concept: Amazon Hive, an ambient-intelligence hub

Amazon Hive turns a reactive house into a proactive partner by giving each
Amazon surface one job in a shared story:

- **Bee captures the context.** The wearable is the home's memory-in-advance:
  it hears the expectations, reminders, and passing thoughts that make up
  your day — starting with who you're expecting, and when.
- **Ring is the sensory perimeter.** Ring supplies the ground truth at the
  door: a person is here, now. Hive deliberately does *not* pretend Ring
  knows who it is — Bee holds the "who," Ring supplies the "when."
- **Alexa+ routes and announces.** A self-hosted MCP server (spec
  2025-11-25, Streamable HTTP) is the integration point: the hub calls real
  MCP tools to announce the right thing about the right visitor.
- **Fire TV is the visual surface.** The door appears on the screen you're
  already looking at — full-screen when it matters, a quiet picture-in-
  picture when it shouldn't interrupt.
- **Bee remembers.** Every visit is logged back into Bee's memory, so the
  day's notes close the loop: expected, arrived, announced, shown, recorded.

Hive is deliberately honest software: anything simulated is labeled
SIMULATED in the UI and in this write-up.

## The 5-step visitor story (what the demo shows)

1. **Bee hears you.** You say *"I'm expecting the cleaner at 3."* Hive
   pattern-matches the utterance, creates a Bee reminder and a Bee memory,
   and stores the expected visit.
2. **Ring sees a person.** A Ring door event (person detected) arrives at
   Hive's webhook receiver, which verifies the HMAC signature exactly as
   the production integration will.
3. **Hive matches.** The arrival is matched against the expected-visitor
   list — expected visitors are announced by name and role; unexpected
   visitors are announced differently, with lower confidence.
4. **Alexa+ announces, Fire TV shows.** The hub calls the real MCP tool
   `announce_visitor` ("Your cleaner is here"), and the Fire TV overlay pops
   up the live front-door view.
5. **Bee logs the visit.** The hub calls the MCP tool `log_visit`, completes
   the Bee reminder, and writes the visit into Bee's memory and the day's
   notes.

Run it locally: `npm install` → `npm start` → walk steps 1–2 in the demo UI;
steps 3–5 fire automatically. `npm test` runs the integration suite.

## New feature 1: Brain Dump Dashboard

Say *"Alexa, show my brain dump"* and Fire TV pulls up the whole day on one
screen: everything Bee captured — expected visitors, reminders, the running
day list — alongside today's Ring events, composed from the same two stores
the hub already keeps, and prioritized so the next thing that needs you is
at the top.

This is the "overthinking antidote": the mental load you offloaded to Bee
all day comes back as one calm, glanceable page on the biggest screen in
the house, instead of a dozen phone notifications.

## New feature 2: Focus Mode

Tap Bee to enter Focus Mode — for studying, working, or just quiet. While
Focus Mode is on:

- A Ring person event **never triggers the Alexa+ audio announcement**
  (the hub emits `announcement_suppressed` instead — Alexa+ is not invoked).
- Fire TV shows the door as a **quiet picture-in-picture** overlay
  (`mode: 'pip'`) instead of a full-screen interruption.
- **Bee still logs the visit.** Focus silences the interruption, not the
  record — nothing is lost, it's just waiting for you.

Turn Focus Mode off and the full 5-step story resumes.

## Concept: the Hive Home Base (physical device — concept only)

Hive the software is designed to graduate into **Hive Home Base**: a small
counter dock where your Bee wearable charges when you walk in the door.
Docking is the handoff — the moment Bee clicks into the Base, the day it
captured out in the world (the brain dump, the expected visitors, the
notes) passes to the house, and Ring, Alexa+, and Fire TV take their orders
from the Base.

**To be explicit: the Home Base is a product concept, not built hardware.**
No physical device exists or is claimed in this submission. It is included
because it shows where the software architecture points: the hub's stores
and event flow are exactly what the Base would run.

## How it's built

- **Hub** (Node/Express): routes events between surfaces; keeps two small
  file stores (expected visitors, day notes); an SSE channel streams events
  to the demo UI in real time. Focus Mode state and the Brain Dump composer
  (`getBrainDump()`) live here.
- **MCP server**: a real, self-hosted MCP server implementing spec
  2025-11-25 over Streamable HTTP, exposing Alexa+ tools including
  `announce_visitor` and `log_visit`. The hub is a real MCP client of it —
  the demo UI's inspector panel shows the actual JSON-RPC handshake
  (initialize → tools/list → tools/call).
- **Ring integration**: a webhook receiver that verifies HMAC signatures
  and consumes payloads in the official documented shapes, with the
  official endpoint URLs in code.
- **Bee adapter**: an interface with a simulation implementing the exact
  data shapes (reminders, memories), designed for a one-line config swap
  to the live device.
- **Fire TV**: a Vega-ready overlay page (the visitor overlay, including
  the Focus Mode PiP variant).

## Real vs. simulated (honest truth boundary)

| Track | Real in v1 | Simulated in v1 |
|---|---|---|
| Ring | Webhook receiver with HMAC verification; official payload shapes; official endpoint URLs in code | Event source (a mock POSTs documented payloads); no Early Access credentials yet |
| Alexa+ | MCP server (2025-11-25, Streamable HTTP), actually invoked by a real MCP client; full handshake visible in the inspector | The Alexa+ device experience (Echo-style web UI) |
| Fire TV | Overlay page source (Vega-ready HTML), including quiet PiP variant | Running on-device (panel in demo page; `.vpkg` build is a later milestone) |
| Bee | Adapter interface + simulation implementing the exact data shapes | Live device data (configuration swap when the device is in hand) |

Things we refuse to fake:

- **Ring familiar-face recognition is not in the Ring Partner API**, so we
  do not fake a face-ID endpoint. Bee holds identity (expected visitors);
  Ring supplies presence.
- **Real Alexa+ add-ons are client-initiated** — servers can't receive
  pushes. Our hub drives a simulated client against the *real* MCP server,
  which is the rules' sanctioned simulated-experience path.
- **There is no verified write path to Bee daily notes**, so "log the
  visit" = `complete_reminder` + `log_memory`; Bee's memory flows into her
  daily summary, and the demo narrates exactly that.

## Product feedback (draft — for the Devpost feedback fields)

**Tools/APIs used, and for what:**
- Ring developer platform (webhooks + documented payload shapes): door
  person events, the core of the Ring track.
- MCP spec 2025-11-25 (Streamable HTTP): the Alexa+ add-on surface —
  `announce_visitor`, `log_visit`.
- Bee adapter surface (reminders/memories data shapes): context capture
  and the visit log.
- Fire TV / Vega web overlay: the visual surface (full-screen + PiP).

**What worked well:**
- MCP over Streamable HTTP was straightforward to self-host and test; the
  initialize → tools/list → tools/call handshake is easy to inspect and
  debug, and our integration tests exercise it end to end.
- Ring's documented payload shapes made a faithful simulator possible
  before Early Access credentials — the receiver code didn't change when
  we swapped mock for documented shapes.

**What needs work:**
- The Ring Partner API has no familiar-face signal, which is the single
  most-requested capability for caretaking/access-control use cases like
  ours; we worked around it by holding identity in Bee, but a supported
  "expected person" primitive would remove the workaround.
- Ring has no official SDK (plain HTTP only), and Early Access credentials
  gate the path from simulator to real devices.
- Bee has no verified write path to daily notes; memory writes work, but
  a documented daily-notes API would make the "Bee remembers" loop
  first-class.
- The Vega `.vpkg` flow needs a virtualization-capable machine (KVM);
  our dev VM couldn't run the virtual device.
- Alexa+ add-ons being client-initiated only means "announce now" patterns
  need a client driver; a documented push/announcement pattern would help.

**Onboarding:** Zero-to-hello-world was fast for MCP (open spec, good
introspection) and slower for Ring/Bee, where the honest path runs through
program applications and device logistics rather than docs alone.

**Would we build with these again?** Yes — the four surfaces genuinely
compose; each limitation above is a missing primitive, not a wrong turn.

## What we'd build next

1. **Ring Early Access credentials** → point the existing webhook receiver
   at real devices (mock stays as fallback); test with a physical doorbell.
2. **Bee device in hand** → `bee login`, flip the adapter to live mode,
   re-verify steps 1 and 5 with real captured data.
3. **Fire TV on device** → package the overlay as a Vega `.vpkg` and run
   it on a Fire TV / virtual device, including the Focus Mode PiP.
4. **Brain Dump, richer** → prioritization learned from the day (missed
   visitors first, upcoming expected visits next), and a spoken summary
   option via Alexa+.
5. **Hive Home Base** → prototype the dock handoff (dock = sync trigger)
   once the software loop is proven on real devices.

---

*Amazon Hive — primary track: Ring (access control, caretaking). Everything
simulated is labeled simulated, in the UI and here.*
