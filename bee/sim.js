// Simulated Bee — implements the BeeAdapter interface with the same data
// shapes the real CLI returns, behind the cleanly-swappable interface.
// SIMULATED until the device arrives (bee.mode === 'sim').
// Swap to live with zero hub/UI changes.

import { BeeAdapter } from './adapter.js';

const SEED_FACTS = [
  'Sabrina works from home most afternoons.',
  'The regular cleaner comes every other Tuesday.',
];
const SEED_TODOS = [
  { id: 'todo-seed-1', text: 'Review Hot Mops bookings', alarm_at: null, completed: false },
];
const SEED_SUMMARY =
  'Today: Sabrina worked from home in the afternoon. Expecting the regular cleaner.';

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export class SimBeeAdapter extends BeeAdapter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.facts = [...SEED_FACTS];
    this.todos = SEED_TODOS.map((t) => ({ ...t }));
    this.todoSeq = 100;
    this.utteranceHandlers = [];
    this.conversations = [
      {
        id: 'conv-seed-1',
        started_at: new Date(Date.now() - 2 * 3600e3).toISOString(),
        utterances: [
          { text: "I'm expecting the cleaner at 3", speaker: 'user', at_ms: Date.now() - 2 * 3600e3 },
        ],
      },
    ];
    // Replaying a seeded utterance lets the demo narrate step 1 from live-ish data.
    this.pendingSeeds = [];
  }

  async get_recent_conversations(_hours = 24) {
    return this.conversations.map((c) => ({ id: c.id, started_at: c.started_at }));
  }

  async get_conversation_transcript(id, since_ms = 0) {
    const conv = this.conversations.find((c) => c.id === id);
    if (!conv) return [];
    return conv.utterances.filter((u) => u.at_ms >= since_ms);
  }

  subscribe_to_utterances(callback) {
    this.utteranceHandlers.push(callback);
    // Flush any utterances queued before a subscriber existed.
    const seeds = this.pendingSeeds.splice(0);
    for (const u of seeds) callback(u);
    // Demo helper: schedule one live utterance a tick later (toggle via config).
    return () => {
      this.utteranceHandlers = this.utteranceHandlers.filter((h) => h !== callback);
    };
  }

  /** Demo/UI helper (not part of the interface): inject an utterance as if heard live. */
  emit_utterance(text, speaker = 'user') {
    const u = { text, speaker, conversation_id: 'conv-live-1', at_ms: Date.now() };
    if (!this.utteranceHandlers.length) this.pendingSeeds.push(u);
    else this.utteranceHandlers.forEach((h) => h(u));
    return u;
  }

  async search_memory(query) {
    const q = (query || '').toLowerCase();
    return this.facts
      .filter((f) => !q || f.toLowerCase().includes(q))
      .map((text) => ({ text, source: 'facts' }));
  }

  async get_facts(query) {
    const q = (query || '').toLowerCase();
    return this.facts.filter((f) => !q || f.toLowerCase().includes(q));
  }

  async log_memory(text) {
    this.facts.push(text);
    return { ok: true, text };
  }

  async create_reminder(text, remind_at_iso) {
    const todo = {
      id: `todo-${this.todoSeq++}`,
      text,
      alarm_at: remind_at_iso,
      completed: false,
      created_at: new Date().toISOString(),
    };
    this.todos.push(todo);
    return todo;
  }

  async list_reminders() {
    return this.todos.filter((t) => !t.completed);
  }

  async complete_reminder(todo_id) {
    const t = this.todos.find((x) => x.id === todo_id);
    if (!t) return { ok: false, error: 'todo not found' };
    t.completed = true;
    t.completed_at = new Date().toISOString();
    return { ok: true, id: todo_id };
  }

  async get_day_summary(date) {
    return {
      date: date || todayStr(),
      summary: this.compose_summary(),
    };
  }

  compose_summary() {
    const lines = [SEED_SUMMARY];
    const visited = this.todos.filter((t) => t.completed && /expected/i.test(t.text));
    for (const t of visited) lines.push(`Logged visit: ${t.text} (completed ${t.completed_at}).`);
    const memFacts = this.facts.slice(SEED_FACTS.length);
    for (const f of memFacts) lines.push(`Memory: ${f}`);
    return lines.join('\n');
  }

  get mode() { return 'sim'; }
}
