// Live Bee — NOT ACTIVE until the Bee device arrives.
//
// Real implementation of the BeeAdapter interface against the official Bee
// CLI (@beeai/cli — `npm install -g @beeai/cli`). Each method shells out to
// the verified CLI command shown in bee/adapter.js.
//
// To activate: `bee login` (Sabrina approves on her phone; Developer Mode =
// tap the app version 5 times), then flip config bee.mode from 'sim' to
// 'live'. Zero changes needed to hub/UI code.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BeeAdapter } from './adapter.js';

const run = promisify(execFile);

function runBee(args) {
  // NOT ACTIVE: device not here yet. When live, this executes the real CLI.
  return run('bee', args, { maxBuffer: 10 * 1024 * 1024 });
}

function parseJson(stdout) {
  try { return JSON.parse(stdout); } catch { return { raw: stdout }; }
}

export class LiveBeeAdapter extends BeeAdapter {
  constructor(config = {}) {
    super();
    this.config = config;
  }

  async get_recent_conversations(_hours = 24) {
    const { stdout } = await runBee(['now', '--json']);
    return parseJson(stdout);
  }

  async get_conversation_transcript(id, since_ms = 0) {
    const { stdout } = await runBee(['conversations', 'transcript', id, '--since', String(since_ms)]);
    return parseJson(stdout);
  }

  subscribe_to_utterances(_callback) {
    // Real path: spawn `bee stream --types new-utterance --json`, parse
    // newline-delimited JSON lines, invoke callback per {text, speaker, conversation_id}.
    // NOT ACTIVE until device arrives — stub returns an unsubscribe no-op.
    throw new Error('LiveBeeAdapter: device not yet connected (bee.mode=live requires bee login)');
  }

  async search_memory(query) {
    const { stdout } = await runBee(['search', '--query', query, '--neural', '--json']);
    return parseJson(stdout);
  }

  async get_facts(query) {
    const args = query ? ['facts', 'search', query, '--json'] : ['facts', 'list', '--json'];
    const { stdout } = await runBee(args);
    return parseJson(stdout);
  }

  async log_memory(text) {
    const { stdout } = await runBee(['facts', 'create', '--text', text, '--json']);
    return parseJson(stdout);
  }

  async create_reminder(text, remind_at_iso) {
    const { stdout } = await runBee(['todos', 'create', '--text', text, '--alarm-at', remind_at_iso, '--json']);
    return parseJson(stdout);
  }

  async list_reminders() {
    const { stdout } = await runBee(['todos', 'list', '--json']);
    return parseJson(stdout);
  }

  async complete_reminder(todo_id) {
    const { stdout } = await runBee(['todos', 'complete', todo_id, '--json']);
    return parseJson(stdout);
  }

  async get_day_summary(date) {
    const d = date || new Date().toISOString().slice(0, 10);
    const { stdout } = await runBee(['daily', 'find', d, '--json']);
    return parseJson(stdout);
  }

  get mode() { return 'live'; }
}
