# Track: Fire TV

## v1 (tonight): simulated panel — demo page shows the overlay

- The demo page (`web/index.html`) includes a **"Fire TV" panel**: when the hub
  emits `visitor_overlay`, it loads `firetv/overlay.html` — the full-screen
  visitor overlay ("LIVE • Front Door" placeholder feed image + Dismiss
  button). It is **labeled SIMULATED** in the UI.
- `firetv/overlay.html` is plain HTML/CSS/JS (no exotic deps) — **Vega-ready**,
  so it drops into a Vega WebView app unchanged.

## Hive additions (v1, same simulated panel)

- **Quiet picture-in-picture:** in Hive Focus Mode the hub emits
  `visitor_overlay` with `mode: 'pip'`, and the demo loads
  `overlay.html?pip=1` — a small corner card over the "program" instead of a
  full-screen takeover, with no Alexa+ announcement.
- **Brain Dump dashboard:** `firetv/dashboard.html` renders the hub's
  `GET /api/brain-dump` composition (Bee's expected visits + Bee's notes +
  today's Ring events, prioritized) as a TV-style day-at-a-glance screen.
  Also Vega-ready plain HTML; labeled SIMULATED in the UI.

## Later milestone (M3): real Vega build

The current VM has no KVM, so it can't run the Vega Virtual Device — the
`.vpkg` build happens on a virtualization-capable machine:

1. Install the free Vega Developer Tools: `vega virtual-device start`
2. Create a Vega app from the `vegaWebview` template; point the WebView at a
   hosted copy of `firetv/overlay.html` (or bundle it as an asset)
3. Listen for the hub's `visitor_overlay` event (websocket/SSE) and trigger
   `overlay.html?who=…&when=…` full-screen
4. `vega build` → `.vpkg`, install on the VVD, record the overlay appearing
   when the mock Ring event fires
5. Record the VVD demo for the submission video

Demo requirement is met in v1 via the simulated panel + the real overlay
source; on-device recording arrives in M3.
