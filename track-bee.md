# Track: Bee

**Status:** simulated now, cleanly swappable when the device arrives next week.
Official CLI is `@beeai/cli` (`npm install -g @beeai/cli`).

## The adapter interface (implemented NOW)

All hub code talks to Bee through `bee/adapter.js` only. Methods map 1:1 to
verified CLI ops:

| Adapter method | Real CLI command |
|---|---|
| `get_recent_conversations(hours)` | `bee now --json` |
| `get_conversation_transcript(id, since_ms)` | `bee conversations transcript <id> --since <epochMs>` |
| `subscribe_to_utterances(cb)` | `bee stream --types new-utterance --json` → `{text, speaker, conversation_id}` |
| `search_memory(query)` | `bee search --query --neural --json` |
| `get_facts(query)` | `bee facts list/search --json` |
| `log_memory(text)` | `bee facts create --text <text> --json` (long-term memory) |
| `create_reminder(text, iso)` | `bee todos create --text <text> --alarm-at <iso> --json` |
| `list_reminders()` | `bee todos list --json` |
| `complete_reminder(todo_id)` | `bee todos complete <id> --json` |
| `get_day_summary(date)` | `bee daily find <YYYY-MM-DD> --json` |

## Step mappings

- **Step 1:** utterance "I'm expecting the cleaner at 3" → pattern-match →
  `create_reminder("Cleaner expected", <3pm ISO>)` +
  `log_memory("Sabrina is expecting the cleaner today at 3pm")` →
  expected-visitors store updated.
- **Step 5:** confirmed arrival → `complete_reminder(todo_id)` +
  `log_memory("Cleaner visited on <date> at <time>")` → day's notes panel
  updates.

**No verified write path to daily notes exists** — so step 5 is
`complete_reminder` + `log_memory`, and the demo narrates that Bee's memory
flows into her daily summary. This is the closest verified "day's notes"
artifact (`bee daily find`).

## What changes when the device arrives (M4)

1. `bee login` (Sabrina approves on her phone; Developer Mode = tap the app
   version 5×)
2. Flip config `bee.mode` from `sim` to `live`
3. Real utterances/memories flow through `bee/live.js` (stubbed now, calling
   the real commands — **NOT ACTIVE** until the device arrives)

Zero changes to hub/UI code.
