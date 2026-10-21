// Mock Ring — posts documented official-shape payloads to /webhook/ring.
//
// SIMULATED event source (v1): no hardware, no credentials. The payloads
// below are faithful to the documented Ring Partner API JSON shape, and they
// are signed with a valid HMAC-SHA256 digest of the raw body bytes using the
// same signing key the server verifies — the same contract a real Ring
// webhook POST would follow.

import crypto from 'node:crypto';

const TARGET = process.env.SELF_URL || 'http://localhost:3000';
const KEY = process.env.RING_HMAC_SIGNING_KEY || 'demo-signing-key-not-for-production';

function signedPayload(payload) {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', KEY).update(raw, 'utf8').digest('hex');
  return { raw, sig };
}

/** Official-shape Ring event: human motion at the front door. */
export function humanAtDoor(deviceId = 'doorbell-front-01') {
  return {
    data: {
      type: 'motion_detected',
      attributes: {
        sub_type: 'human',
        source: deviceId,
        timestamp: new Date().toISOString(),
      },
    },
    meta: { occurred_at: new Date().toISOString() },
  };
}

/** Official-shape Ring event: doorbell button press. */
export function doorbellPress(deviceId = 'doorbell-front-01') {
  return {
    data: {
      type: 'button_press',
      attributes: {
        source: deviceId,
        timestamp: new Date().toISOString(),
      },
    },
    meta: { occurred_at: new Date().toISOString() },
  };
}

export async function postRingEvent(payload) {
  const { raw, sig } = signedPayload(payload);
  const res = await fetch(`${TARGET}/webhook/ring`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Signature': sig,
    },
    body: raw,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

export async function mockHumanAtDoor(deviceId) {
  return postRingEvent(humanAtDoor(deviceId));
}

export async function mockDoorbellPress(deviceId) {
  return postRingEvent(doorbellPress(deviceId));
}

// CLI: node hub/mock-ring.js [human|press]
if (process.argv[1]?.endsWith('mock-ring.js')) {
  const kind = process.argv[2] || 'human';
  const fn = kind === 'press' ? mockDoorbellPress : mockHumanAtDoor;
  fn().then((r) => console.log(JSON.stringify(r, null, 2)));
}
