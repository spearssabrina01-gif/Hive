// BeeAdapter — the interface all hub code uses to talk to Bee.
//
// Both the simulated Bee (bee/sim.js, active when bee.mode === 'sim') and
// the live Bee (bee/live.js, active when bee.mode === 'live') implement this
// interface. Hub/UI code must never touch the sim or CLI directly — only via
// the adapter. That is what makes the device arrival a one-line config swap.
//
// Verified real CLI mappings (official CLI: @beeai/cli, `npm install -g @beeai/cli`):
//   get_recent_conversations(hours)  ->  bee now --json
//   get_conversation_transcript(id, since_ms)  ->  bee conversations transcript <id> --since <epochMs>
//   subscribe_to_utterances(cb)      ->  bee stream --types new-utterance --json  (cb receives {text, speaker, conversation_id})
//   search_memory(query)             ->  bee search --query --neural --json
//   get_facts(query)                 ->  bee facts list/search --json
//   log_memory(text)                 ->  bee facts create --text <text> --json
//   create_reminder(text, iso)       ->  bee todos create --text <text> --alarm-at <iso> --json
//   list_reminders()                 ->  bee todos list --json
//   complete_reminder(todo_id)       ->  bee todos complete <id> --json
//   get_day_summary(date)            ->  bee daily find <YYYY-MM-DD> --json
//
// NOTE: there is no verified write path to Bee daily notes, so "log the
// visit in the day's notes" = complete_reminder() + log_memory(); Bee's
// memory flows into the daily summary. The demo narrates this honestly.

export const BEE_MODES = ['sim', 'live'];

/** @interface — each method is async unless noted. */
export class BeeAdapter {
  async get_recent_conversations(_hours) { throw new Error('not implemented'); }
  async get_conversation_transcript(_id, _since_ms) { throw new Error('not implemented'); }
  subscribe_to_utterances(_callback) { throw new Error('not implemented'); }
  async search_memory(_query) { throw new Error('not implemented'); }
  async get_facts(_query) { throw new Error('not implemented'); }
  async log_memory(_text) { throw new Error('not implemented'); }
  async create_reminder(_text, _remind_at_iso) { throw new Error('not implemented'); }
  async list_reminders() { throw new Error('not implemented'); }
  async complete_reminder(_todo_id) { throw new Error('not implemented'); }
  async get_day_summary(_date) { throw new Error('not implemented'); }
}

/** Returns the adapter for the configured mode (bee.mode: 'sim' | 'live'). */
export async function getBeeAdapter(config) {
  const mode = (config?.bee?.mode || process.env.BEE_MODE || 'sim').toLowerCase();
  if (mode === 'live') {
    const { LiveBeeAdapter } = await import('./live.js');
    return new LiveBeeAdapter(config);
  }
  const { SimBeeAdapter } = await import('./sim.js');
  return new SimBeeAdapter(config);
}
