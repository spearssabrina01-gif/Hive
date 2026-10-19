# Track: Ring

**Status:** primary track — priority "access control, caretaking". Physical
Ring device NOT required; simulators fine.

## Official Ring Partner API (what we code against)

- Base: `https://api.amazonvision.com` (REST, JSON:API)
- OAuth token: `https://oauth.ring.com/oauth/token`
- **No official SDK exists** — plain HTTP only. We deliberately do NOT use
  community reverse-engineered libs (`ring-client-api`, `python-ring-doorbell`);
  hackathon rules require official tech.

## Webhook contract (implemented in `hub/ring-webhook.js`)

- Ring POSTs events to our webhook URL. We verify the **HMAC-SHA256 hex
  digest of the RAW body bytes** against the `X-Signature` header using our
  HMAC signing key — **before parsing JSON**, with a timing-safe comparison —
  and respond HTTP 200 within 5 seconds.
- Person at door: `data.type === "motion_detected"` with
  `data.attributes.sub_type === "human"`.
- Doorbell press: `data.type === "button_press"`; device id at
  `data.attributes.source`.

## Familiar faces — honest boundary

Familiar-face recognition is **NOT** in the Partner API. We do **not** fake a
Ring face-ID endpoint. The concept split is real and intentional:

- **Ring** supplies the *when*: human motion / button press at the door.
- **Bee** holds the *who*: the expected visitor ("cleaner at 3") she heard.

## Simulation in v1 (faithful contract, no hardware)

A Ring sandbox with synthetic devices exists; in v1 our event source is our
own mock (`hub/mock-ring.js`) POSTing the documented official JSON payload
shape to `/webhook/ring`, signed with a valid HMAC using the demo key — the
same contract a real Ring POST follows.

## What's missing (no credentials yet)

Full API access may require the Ring Developer Early Access Program
(https://developer.amazon.com/ring). Until then: webhook receiver is real,
payload shapes are official, endpoint URLs are in the code, event source is
simulated.
