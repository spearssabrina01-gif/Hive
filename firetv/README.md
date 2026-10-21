# Fire TV — v1 simulated panel, Vega-ready overlay

**v1 (tonight):** the demo web page includes a "Fire TV" panel showing the
full-screen visitor overlay (`firetv/overlay.html`: "LIVE • Front Door"
placeholder feed image + Dismiss button), triggered by the hub event. It is
**labeled SIMULATED** in the UI. The overlay HTML is written to be Vega-ready
(plain HTML/CSS/JS, no exotic deps) so it can be dropped into a Vega WebView
app unchanged.

**Hive additions (v1):** the overlay also renders a quiet picture-in-picture
variant (`overlay.html?pip=1`) used when Hive Focus Mode holds the Alexa+
announcement, and `firetv/dashboard.html` renders the Brain Dump dashboard
(Bee's day list + Ring events from the hub's `GET /api/brain-dump`). Both
follow the same Vega-ready, labeled-SIMULATED pattern.

**Later milestone (M3):** build a real Vega `.vpkg` on a virtualization-capable
machine (the current VM has no KVM, so it can't run the Vega Virtual Device).
Steps, using the free Vega Developer Tools:

1. Install Vega Developer Tools and start a virtual device:
   `vega virtual-device start`
2. Create a Vega app from the `vegaWebview` template and point the WebView at
   a hosted copy of `overlay.html` (or bundle it as an asset).
3. Listen for the hub's `visitor_overlay` event (websocket/SSE from the hub)
   and trigger `overlay.html?who=...&when=...` full-screen.
4. Package: `vega build` → `.vpkg`, install on the VVD, record the overlay
   appearing when the mock Ring event fires.
5. Record the demo on the VVD for the submission video.

Demo requirement met in v1 via the simulated panel + this overlay source;
on-device recording arrives in M3.
