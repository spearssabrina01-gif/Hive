# Build plan

- **M1 (tonight — DONE):** v1 demo prototype running locally. All 5 steps
  walkable (`npm start` → demo UI at http://localhost:3000), tests pass
  (`npm test`).
- **M2: Real Ring.** Sabrina applies to the Ring Developer Early Access
  Program (https://developer.amazon.com/ring); wire the real webhook URL and
  sandbox synthetic devices; keep the mock as fallback.
- **M3: Fire TV.** Build the Vega `.vpkg` on a virtualization-capable machine
  (current VM has no KVM): `vega virtual-device start`, `vegaWebview`
  template wrapping `firetv/overlay.html`, record the overlay on the VVD.
- **M4: Bee device arrives.** `bee login` (Sabrina approves on her phone;
  Developer Mode = tap app version 5×), flip `bee.mode` to `live`, re-verify
  steps 1 & 5 with real data.
- **M5: Demo video (<3 min), repo pushed to GitHub** (Sabrina approves public
  vs private), text description, product feedback for every tool/API used.
- **M6: DevPost submission** (Sabrina; needs her DevPost account). Deadline
  Oct 23, 2026.
