// Event hub — Amazon Hive: routes the 5-step connected story plus the two
// Hive behaviors (Brain Dump dashboard + Focus Mode).
//
// 1. Bee utterance "I'm expecting the cleaner at 3"
//    → pattern-match → Bee create_reminder + log_memory → expected-visitors store
// 2. Ring mock webhook → person_detected
// 3. hub matches visitor vs expected → tools/call announce_visitor → MCP /api/mcp
//    (skipped in Focus Mode: Alexa+ stays silent, event announcement_suppressed)
// 4. hub emits visitor_overlay event → Fire TV panel (v1 simulated);
//    in Focus Mode the overlay is a quiet picture-in-picture (mode: 'pip')
// 5. hub → tools/call log_visit + Bee log_memory/complete_reminder → day's notes
//    (logging happens in Focus Mode too — Bee still remembers)
//
// Hive extras:
// - getBrainDump(): Bee's captured day list (expected visitors) + today's
//   Ring events, composed from the same two stores, prioritized.
// - focus: in-memory Focus Mode state, toggled by "tapping Bee".
//
// The hub keeps a tiny file store (data/) for expected-visitors.json and
// day-notes.json, and an SSE channel so the demo UI sees events in real time.

import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || new URL('../data/', import.meta.url).pathname;

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(name, fallback) {
  ensureDataDir();
  const p = path.join(DATA_DIR, name);
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function writeJson(name, value) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(value, null, 2));
}

const VISITOR_RE = /expecting (?:the |a )?([a-z]+)(?: at|@| around)? ?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

export function parseExpectedVisitor(text) {
  const m = (text || '').match(VISITOR_RE);
  if (!m) return null;
  let hour = parseInt(m[2], 10);
  const ampm = (m[4] || 'pm').toLowerCase();
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  const today = new Date();
  today.setHours(hour, parseInt(m[3] || '0', 10), 0, 0);
  return { name: m[1].toLowerCase(), expected_at: today.toISOString() };
}

export function createEventHub({ bee, onEvent } = {}) {
  const emit = (type, payload = {}) => {
    const ev = { type, at: new Date().toISOString(), ...payload };
    onEvent?.(ev);
    return ev;
  };

  const expectedVisitors = {
    all() { return readJson('expected-visitors.json', []); },
    add(v) {
      const list = expectedVisitors.all();
      list.push(v);
      writeJson('expected-visitors.json', list);
      return v;
    },
    findMatch(doorEvent) {
      // Match any not-yet-arrived expected visitor whose window includes now.
      const list = expectedVisitors.all().filter((v) => !v.arrived_at);
      const now = Date.now();
      return list.find((v) => {
        const t = new Date(v.expected_at).getTime();
        return Math.abs(now - t) < 2 * 3600e3; // ±2h window
      }) || list[0] || null;
    },
    markArrived(id, at) {
      const list = expectedVisitors.all().map((v) =>
        v.id === id ? { ...v, arrived_at: at } : v
      );
      writeJson('expected-visitors.json', list);
    },
  };

  const dayNotes = {
    all() { return readJson('day-notes.json', []); },
    append(entry) {
      const list = dayNotes.all();
      list.push(entry);
      writeJson('day-notes.json', list);
      return entry;
    },
  };

  // ---- Hive: Focus Mode state (in-memory; "tap Bee" toggles it) ----
  let focusOn = false;
  const focus = {
    enabled() { return focusOn; },
    set(on) {
      focusOn = !!on;
      emit('focus_mode', { enabled: focusOn });
      return focusOn;
    },
    toggle() { return focus.set(!focusOn); },
  };

  /** Hive: Brain Dump — Bee's captured day list + today's Ring events,
   *  composed from the existing stores (no parallel data store), prioritized:
   *  waiting visitors first (soonest first), then today's arrivals (newest
   *  first); Ring door events newest first; Bee's other notes after. */
  function getBrainDump() {
    const visitors = expectedVisitors.all()
      .map((v) => ({
        name: v.name,
        expected_at: v.expected_at,
        arrived: !!v.arrived_at,
        arrived_at: v.arrived_at || null,
        status: v.arrived_at ? 'arrived' : 'waiting',
      }))
      .sort((a, b) => {
        if (a.arrived !== b.arrived) return a.arrived ? 1 : -1;
        return a.arrived
          ? new Date(b.arrived_at) - new Date(a.arrived_at)
          : new Date(a.expected_at) - new Date(b.expected_at);
      });

    const notes = dayNotes.all();
    const isDoorNote = (n) => / at the door/.test(n.text || '');
    const ringEvents = notes.filter(isDoorNote)
      .map((n) => ({ at: n.at, text: n.text })).reverse();
    const beeNotes = notes.filter((n) => !isDoorNote(n))
      .map((n) => ({ at: n.at, text: n.text })).reverse();

    return {
      generated_at: new Date().toISOString(),
      focus_mode: focus.enabled(),
      expected_visitors: visitors,
      ring_events: ringEvents,
      bee_notes: beeNotes,
    };
  }

  /** Step 1: handle a Bee utterance. */
  async function handleUtterance({ text, speaker }) {
    const parsed = parseExpectedVisitor(text);
    emit('bee_utterance', { text, speaker, parsed });
    if (!parsed) return { matched: false };

    // Step 1 mapping: create_reminder + log_memory in Bee, then update the store.
    const todo = await bee.create_reminder(
      `Cleaner expected — ${parsed.name}`, parsed.expected_at
    );
    await bee.log_memory(`Sabrina is expecting the ${parsed.name} today at ${parsed.expected_at}`);

    const visitor = {
      id: `visitor-${Date.now()}`,
      name: parsed.name,
      expected_at: parsed.expected_at,
      bee_todo_id: todo.id,
      arrived_at: null,
    };
    expectedVisitors.add(visitor);
    emit('expected_visit_logged', { visitor });
    return { matched: true, visitor };
  }

  /** Step 2→5: handle a verified Ring door event.
   *  Focus Mode: step 3's Alexa+ announcement is held (no audio) and step 4's
   *  Fire TV overlay becomes a quiet picture-in-picture; step 5 still logs. */
  async function handleDoorEvent(doorEvent) {
    emit('door_event', { doorEvent });

    const match = expectedVisitors.findMatch(doorEvent);
    const expected = !!match;
    const visitorName = match?.name || 'Someone';
    const quiet = focus.enabled();

    // Step 3: ask the MCP server for the announcement (hub is an MCP client) —
    // unless Focus Mode is on, in which case Alexa+ is never invoked.
    let announcementText = null;
    if (quiet) {
      emit('announcement_suppressed', { visitor_name: visitorName, expected, reason: 'focus_mode' });
    } else {
      const announce = await callMcpTool('announce_visitor', {
        visitor_name: visitorName,
        confidence: expected ? 0.92 : 0.4,
        expected,
      });
      announcementText = announce.announcement_text;
      emit('announcement', { text: announcementText, expected });
    }

    // Step 4: Fire TV overlay — full-screen normally, quiet PiP in Focus Mode.
    emit('visitor_overlay', {
      title: quiet ? 'Front Door — quiet picture-in-picture' : 'LIVE • Front Door',
      device_id: doorEvent.device_id,
      visitor_name: visitorName,
      mode: quiet ? 'pip' : 'full',
      quiet,
    });

    // Step 5: log via MCP tool, then Bee memory (no daily-notes write path exists,
    // so we complete the reminder + log memory; Bee's memory flows to the summary).
    await callMcpTool('log_visit', {
      visitor_name: visitorName,
      timestamp: new Date().toISOString(),
      notes: expected ? 'Expected visitor arrived' : 'Unexpected visitor',
    });
    if (match) {
      expectedVisitors.markArrived(match.id, new Date().toISOString());
      await bee.complete_reminder(match.bee_todo_id);
      await bee.log_memory(
        `${capitalize(visitorName)} visited on ${todayStr()} at ${timeStr()}.`
      );
    }
    const note = {
      at: new Date().toISOString(),
      text: quiet
        ? `${capitalize(visitorName)} ${expected ? '(expected)' : '(unexpected)'} at the door — Focus Mode: Alexa+ stayed silent, quiet picture-in-picture on Fire TV, logged by Bee.`
        : `${capitalize(visitorName)} ${expected ? '(expected)' : '(unexpected)'} at the door — announced via Alexa+, shown on Fire TV, logged by Bee.`,
    };
    dayNotes.append(note);
    emit('visit_logged', { note, visitor_name: visitorName, expected });

    return { visitorName, expected, announcement: announcementText, focus_mode: quiet };
  }

  async function callMcpTool(name, args) {
    // The hub calls its own MCP endpoint over HTTP (same contract any
    // Alexa+ add-on client would use). Exported for reuse/tests.
    const res = await fetch(`${process.env.SELF_URL || 'http://localhost:3000'}/api/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    });
    const json = await res.json();
    const text = json?.result?.content?.[0]?.text;
    return JSON.parse(text);
  }

  return {
    handleUtterance,
    handleDoorEvent,
    callMcpTool,
    expectedVisitors,
    dayNotes,
    focus,
    getBrainDump,
    emit,
  };
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function timeStr() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
