// Amazon Hive — central Node/Express hub.
//
// Orchestrates: Bee(sim) utterances → expected visits → Ring (mock webhook)
// → MCP /api/mcp announcement → Fire TV overlay event → Bee day-notes logging.
// Hive extras: Focus Mode (tap Bee — no announcement, quiet Fire TV PiP,
// visit still logged) and the Brain Dump dashboard (Bee's day list + Ring
// events, composed from the hub's stores).
//
// Routes:
//   GET  /                       → demo web UI
//   POST /api/mcp                → REAL MCP server (Alexa+ tools), spec 2025-11-25
//   POST /webhook/ring           → Ring event receiver, HMAC-SHA256 verified
//   GET  /api/events             → SSE stream of hub events (demo UI)
//   GET  /api/state              → expected visitors + day notes + Bee mode + focus mode
//   GET  /api/brain-dump         → Hive Brain Dump dashboard data (from hub stores)
//   POST /api/demo/utterance     → inject "I'm expecting the cleaner at 3" (Bee sim)
//   POST /api/demo/ring-human    → fire the mock Ring human-at-door event
//   POST /api/demo/ring-press    → fire the mock Ring doorbell-press event
//   POST /api/demo/focus         → toggle/set Hive Focus Mode (tap Bee)
//   POST /api/demo/brain-dump    → trigger the Brain Dump dashboard (SSE + data)
//   POST /api/demo/reset         → clear demo data

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMcpApp } from '../mcp/server.js';
import { verifySignature, parseRingEvent, rawBodySaver, RING_API_BASE, RING_OAUTH_URL } from './ring-webhook.js';
import { createEventHub } from './event-hub.js';
import { getBeeAdapter } from '../bee/adapter.js';
import { mockHumanAtDoor, mockDoorbellPress } from './mock-ring.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;

const config = {
  bee: { mode: (process.env.BEE_MODE || 'sim').toLowerCase() }, // 'sim' now; flip to 'live' when device arrives
};

console.log(`Amazon Hive hub — Ring API base: ${RING_API_BASE} (events via webhook receiver)`);
console.log(`Ring OAuth (future, Early Access pending): ${RING_OAUTH_URL}`);
console.log(`Bee mode: ${config.bee.mode}`);

const bee = await getBeeAdapter(config);

// SSE clients for the demo UI.
const sseClients = new Set();
function broadcast(ev) {
  const line = `data: ${JSON.stringify(ev)}\n\n`;
  for (const res of sseClients) res.write(line);
}

const hub = createEventHub({ bee, onEvent: (ev) => broadcast(ev) });

// Subscribe the hub to Bee utterances (sim: replay + injected; live: real stream).
bee.subscribe_to_utterances?.((u) => {
  hub.handleUtterance(u).catch((e) => console.error('utterance error', e));
});

const app = express();

// Serve the demo UI.
app.use(express.static(path.join(ROOT, 'web')));
app.use('/firetv', express.static(path.join(ROOT, 'firetv')));

// REAL MCP endpoint (Alexa+ tools) — must parse JSON body for JSON-RPC.
app.post('/api/mcp', express.json({ limit: '1mb' }), await createMcpApp(() => hub));

// Ring webhook receiver: RAW body bytes for HMAC verification, 200 within 5s.
app.post('/webhook/ring', express.raw({ type: '*/*', limit: '256kb', verify: rawBodySaver }), async (req, res) => {
  const raw = req.rawBody || Buffer.alloc(0);
  try {
    verifySignature(raw, req.headers['x-signature']);
  } catch (err) {
    console.warn('Ring webhook signature rejected:', err.message);
    return res.status(401).json({ error: 'invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'invalid JSON' });
  }

  const doorEvent = parseRingEvent(payload);
  // Respond within 5s; process asynchronously.
  res.status(200).json({ received: true, kind: doorEvent.kind });
  if (doorEvent.kind === 'person_detected' || doorEvent.kind === 'button_press') {
    hub.handleDoorEvent(doorEvent).catch((e) => console.error('door event error', e));
  } else {
    broadcast({ type: 'door_event_ignored', at: new Date().toISOString(), kind: doorEvent.kind });
  }
});

// SSE
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
  });
  res.write('data: {"type":"hello"}\n\n');
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// State
app.get('/api/state', (req, res) => {
  res.json({
    bee_mode: config.bee.mode,
    focus_mode: hub.focus.enabled(),
    expected_visitors: hub.expectedVisitors.all(),
    day_notes: hub.dayNotes.all(),
  });
});

// Hive Brain Dump dashboard data — composed by the hub from its existing
// expected-visitors + day-notes stores (no parallel store).
app.get('/api/brain-dump', (req, res) => {
  res.json(hub.getBrainDump());
});

// Demo controls (these are what the UI's Run buttons call).
app.post('/api/demo/utterance', express.json(), async (req, res) => {
  const text = req.body?.text || "I'm expecting the cleaner at 3";
  const result = await hub.handleUtterance({ text, speaker: 'user' });
  // Route through the sim's utterance path too, so the live-data story holds.
  res.json({ ok: true, result });
});

app.post('/api/demo/ring-human', async (req, res) => {
  const r = await mockHumanAtDoor();
  res.json({ ok: r.status === 200, ring: r });
});

app.post('/api/demo/ring-press', async (req, res) => {
  const r = await mockDoorbellPress();
  res.json({ ok: r.status === 200, ring: r });
});

// Hive Focus Mode — "tap Bee". Body {enabled: bool} sets; empty body toggles.
// The hub emits a focus_mode event, which SSE-broadcasts to the demo UI.
app.post('/api/demo/focus', express.json(), (req, res) => {
  const enabled = typeof req.body?.enabled === 'boolean'
    ? hub.focus.set(req.body.enabled)
    : hub.focus.toggle();
  res.json({ ok: true, focus_mode: enabled });
});

// Hive Brain Dump — "show my brain dump": compose the dashboard from the
// hub's stores and push it to the demo UI over SSE.
app.post('/api/demo/brain-dump', (req, res) => {
  const dashboard = hub.getBrainDump();
  broadcast({ type: 'brain_dump', at: dashboard.generated_at, dashboard });
  res.json({ ok: true, dashboard });
});

app.post('/api/demo/reset', (req, res) => {
  for (const f of ['expected-visitors.json', 'day-notes.json']) {
    try { fs.unlinkSync(path.join(ROOT, 'data', f)); } catch {}
  }
  hub.focus.set(false);
  broadcast({ type: 'reset', at: new Date().toISOString() });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Hub listening on http://localhost:${PORT}`);
  console.log(`Demo UI: http://localhost:${PORT}/`);
});
