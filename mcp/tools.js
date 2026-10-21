// MCP tools for the Alexa+ experience — "Amazon Hive".
//
// Served via mcp/server.js on POST /api/mcp (Streamable HTTP, spec 2025-11-25).
// The hub and the demo web UI call these tools over JSON-RPC.

import { z } from 'zod';

/** The tool implementations are closures over a hub-context provider so the
 *  MCP server stays decoupled from the hub instance lifecycle. */
export function buildToolDefs(getHub) {
  return [
    {
      name: 'get_expected_visitors',
      description: 'List visitors Bee heard the user expecting (from Bee reminders/memories).',
      schema: z.object({}),
      handler: async () => {
        const list = getHub().expectedVisitors.all();
        return {
          visitors: list.map((v) => ({
            name: v.name,
            expected_at: v.expected_at,
            arrived: !!v.arrived_at,
          })),
        };
      },
    },
    {
      name: 'announce_visitor',
      description: 'Build the spoken announcement for a visitor at the door.',
      schema: z.object({
        visitor_name: z.string(),
        confidence: z.number().min(0).max(1),
        expected: z.boolean(),
      }),
      handler: async ({ visitor_name, expected }) => {
        const text = expected
          ? `Your ${visitor_name} is here.`
          : `Someone is at the front door.`;
        return { announcement_text: text };
      },
    },
    {
      name: 'log_visit',
      description: 'Log a completed visitor arrival in the day\'s notes.',
      schema: z.object({
        visitor_name: z.string(),
        timestamp: z.string(),
        notes: z.string().optional(),
      }),
      handler: async ({ visitor_name, timestamp, notes }) => {
        getHub().dayNotes.append({
          at: timestamp,
          text: `${visitor_name} visit logged${notes ? ` — ${notes}` : ''}.`,
          via: 'mcp:log_visit',
        });
        return { logged: true };
      },
    },
  ];
}
