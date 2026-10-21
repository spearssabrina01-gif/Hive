// MCP integration tests — plain node, no test framework.
// Exercises: initialize → notifications/initialized → tools/list →
// tools/call announce_visitor and tools/call log_visit against POST /api/mcp,
// asserting the 2025-11-25 Streamable HTTP protocol round-trip works.
// Also: Ring webhook 200 with valid HMAC, 401 with a bad signature.
// Run: npm test  (requires the hub: npm start, or the test boots it itself)

import assert from 'node:assert';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const PORT = 3101;
const BASE = `http://localhost:${PORT}`;
let child = null;

async function startServer() {
  child = spawn('node', ['hub/server.js'], {
    cwd: new URL('../', import.meta.url).pathname,
    env: { ...process.env, PORT: String(PORT), SELF_URL: BASE },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/state`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not start');
}

let id = 1;
async function mcp(method, params = {}, notify = false) {
  const body = notify
    ? { jsonrpc: '2.0', method, params }
    : { jsonrpc: '2.0', id: id++, method, params };
  const res = await fetch(`${BASE}/api/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(body),
  });
  if (notify) {
    // Notifications are accepted with 202 and no body.
    assert.ok(res.status === 200 || res.status === 202, `MCP ${method} HTTP status`);
    return null;
  }
  assert.strictEqual(res.status, 200, `MCP ${method} HTTP status`);
  return res.json();
}

function sign(raw) {
  return crypto.createHmac('sha256', 'demo-signing-key-not-for-production').update(raw).digest('hex');
}

async function main() {
  await startServer();
  let passed = 0;
  const ok = (name) => { passed++; console.log(`✓ ${name}`); };

  // 1. MCP initialize
  const init = await mcp('initialize', {
    protocolVersion: '2025-11-25', capabilities: {},
    clientInfo: { name: 'test-client', version: '0.0.1' },
  });
  assert.ok(init.result.serverInfo, 'initialize returns serverInfo');
  assert.strictEqual(init.result.protocolVersion, '2025-11-25', 'negotiates 2025-11-25');
  ok('MCP initialize (2025-11-25)');

  // 2. notifications/initialized
  await mcp('notifications/initialized', {}, true);
  ok('MCP notifications/initialized');

  // 3. tools/list
  const list = await mcp('tools/list');
  const names = list.result.tools.map((t) => t.name).sort();
  assert.deepStrictEqual(names, ['announce_visitor', 'get_expected_visitors', 'log_visit']);
  ok('MCP tools/list → 3 tools');

  // 4. tools/call announce_visitor
  const ann = await mcp('tools/call', {
    name: 'announce_visitor',
    arguments: { visitor_name: 'cleaner', confidence: 0.92, expected: true },
  });
  const annJson = JSON.parse(ann.result.content[0].text);
  assert.strictEqual(annJson.announcement_text, 'Your cleaner is here.');
  ok('MCP tools/call announce_visitor → "Your cleaner is here."');

  // 5. tools/call log_visit
  const lg = await mcp('tools/call', {
    name: 'log_visit',
    arguments: { visitor_name: 'cleaner', timestamp: new Date().toISOString() },
  });
  assert.strictEqual(JSON.parse(lg.result.content[0].text).logged, true);
  ok('MCP tools/call log_visit → {logged: true}');

  // 6. Ring webhook: valid HMAC → 200
  const payload = {
    data: { type: 'motion_detected', attributes: { sub_type: 'human', source: 'doorbell-front-01' } },
  };
  const raw = JSON.stringify(payload);
  let res = await fetch(`${BASE}/webhook/ring`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Signature': sign(raw) },
    body: raw,
  });
  assert.strictEqual(res.status, 200, 'valid HMAC → 200');
  ok('Ring webhook 200 with valid HMAC');

  // 7. Ring webhook: bad signature → 401
  res = await fetch(`${BASE}/webhook/ring`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Signature': 'deadbeef' },
    body: raw,
  });
  assert.strictEqual(res.status, 401, 'bad signature → 401');
  ok('Ring webhook 401 with bad signature');

  // 8. End-to-end: utterance → expected visit stored
  await fetch(`${BASE}/api/demo/reset`, { method: 'POST' });
  const utt = await fetch(`${BASE}/api/demo/utterance`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: "I'm expecting the cleaner at 3" }),
  }).then((r) => r.json());
  assert.strictEqual(utt.result.matched, true, 'utterance pattern matched');
  assert.strictEqual(utt.result.visitor.name, 'cleaner');
  const state = await fetch(`${BASE}/api/state`).then((r) => r.json());
  assert.strictEqual(state.expected_visitors.length, 1, 'expected visit stored');
  ok('Step 1 end-to-end: utterance → expected visit stored');

  // 9. End-to-end: Ring person → announcement + day notes
  const ring = await fetch(`${BASE}/api/demo/ring-human`, { method: 'POST' }).then((r) => r.json());
  assert.strictEqual(ring.ok, true, 'mock ring event accepted');
  await new Promise((r) => setTimeout(r, 1500)); // allow async hub processing
  const state2 = await fetch(`${BASE}/api/state`).then((r) => r.json());
  assert.ok(state2.day_notes.length > 0, 'day notes updated after arrival');
  assert.ok(state2.expected_visitors[0].arrived_at, 'visitor marked arrived');
  ok('Steps 2–5 end-to-end: Ring person → announcement + Fire TV overlay event + day notes');

  // 10. Hive Brain Dump: dashboard composed from the hub's existing stores,
  //     prioritized (waiting visitors before arrived ones).
  const utt2 = await fetch(`${BASE}/api/demo/utterance`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: "I'm expecting the plumber at 5" }),
  }).then((r) => r.json());
  assert.strictEqual(utt2.result.visitor.name, 'plumber');
  const dump = await fetch(`${BASE}/api/brain-dump`).then((r) => r.json());
  assert.ok(Array.isArray(dump.expected_visitors), 'dashboard lists expected visitors');
  assert.strictEqual(dump.expected_visitors[0].name, 'plumber', 'waiting visitor prioritized first');
  assert.strictEqual(dump.expected_visitors[0].status, 'waiting');
  assert.ok(dump.expected_visitors.some((v) => v.name === 'cleaner' && v.status === 'arrived'),
    'arrived visitor still listed');
  assert.ok(dump.ring_events.length >= 1, 'dashboard includes today\'s Ring events');
  assert.ok(/at the door/.test(dump.ring_events[0].text), 'ring events come from the day-notes store');
  assert.strictEqual(typeof dump.focus_mode, 'boolean', 'dashboard reports focus mode');
  const bd = await fetch(`${BASE}/api/demo/brain-dump`, { method: 'POST' }).then((r) => r.json());
  assert.strictEqual(bd.ok, true, 'demo brain-dump trigger accepted');
  assert.ok(bd.dashboard.ring_events.length >= 1, 'trigger returns the composed dashboard');
  ok('Hive Brain Dump: expected visits + Ring events composed from hub stores, prioritized');

  // 11. Hive Focus Mode: Ring event → NO Alexa+ announcement, but the visit
  //     is still logged by Bee (day note calls out focus mode).
  await fetch(`${BASE}/api/demo/reset`, { method: 'POST' });
  await fetch(`${BASE}/api/demo/utterance`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: "I'm expecting the cleaner at 3" }),
  });
  const fOn = await fetch(`${BASE}/api/demo/focus`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: true }),
  }).then((r) => r.json());
  assert.strictEqual(fOn.focus_mode, true, 'focus mode set on');
  const stateF = await fetch(`${BASE}/api/state`).then((r) => r.json());
  assert.strictEqual(stateF.focus_mode, true, 'state reports focus mode on');
  await fetch(`${BASE}/api/demo/ring-human`, { method: 'POST' });
  await new Promise((r) => setTimeout(r, 1500)); // allow async hub processing
  const stateF2 = await fetch(`${BASE}/api/state`).then((r) => r.json());
  const doorNotes = stateF2.day_notes.filter((n) => /at the door/.test(n.text));
  assert.ok(doorNotes.length >= 1, 'visit still logged in focus mode');
  const focusNote = doorNotes[doorNotes.length - 1];
  assert.ok(/focus mode/i.test(focusNote.text), 'focus-mode day note recorded');
  assert.ok(!/announced via Alexa\+/.test(focusNote.text), 'no announcement in focus mode');
  assert.ok(stateF2.expected_visitors[0].arrived_at, 'visitor marked arrived in focus mode');
  ok('Hive Focus Mode: announcement held, visit still logged by Bee');

  // 12. Focus Mode off: the normal announced flow returns.
  const fOff = await fetch(`${BASE}/api/demo/focus`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled: false }),
  }).then((r) => r.json());
  assert.strictEqual(fOff.focus_mode, false, 'focus mode set off');
  await fetch(`${BASE}/api/demo/ring-human`, { method: 'POST' });
  await new Promise((r) => setTimeout(r, 1500));
  const stateF3 = await fetch(`${BASE}/api/state`).then((r) => r.json());
  const doorNotes2 = stateF3.day_notes.filter((n) => /at the door/.test(n.text));
  const lastNote = doorNotes2[doorNotes2.length - 1];
  assert.ok(/announced via Alexa\+/.test(lastNote.text), 'announcements resume when focus is off');
  ok('Hive Focus Mode off: announced 5-step flow restored');

  console.log(`\n${passed} tests passed.`);
}

try {
  await main();
} finally {
  child?.kill();
  process.exitCode = 0;
}
