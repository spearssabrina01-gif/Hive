// Ring webhook receiver — official Ring Partner API contract.
//
// - Base API: https://api.amazonvision.com (REST, JSON:API)
// - OAuth token endpoint: https://oauth.ring.com/oauth/token
// - Ring POSTs events to our webhook; we MUST verify the HMAC-SHA256 hex
//   digest of the RAW body bytes against the X-Signature header using our
//   HMAC signing key BEFORE parsing JSON, and respond 200 within 5 seconds.
// - Person at door:  event data.type === 'motion_detected' with
//   data.attributes.sub_type === 'human'
// - Doorbell press:  event data.type === 'button_press',
//   device id at data.attributes.source
//
// IMPORTANT: familiar-face recognition is NOT in the Partner API — we do NOT
// fake a Ring face-ID endpoint. Ring supplies the "when" (human at door);
// Bee holds the "who" (expected visitor "cleaner at 3").
//
// No official SDK exists — plain HTTP only. Do NOT use community
// reverse-engineered libs (ring-client-api, python-ring-door-doorbell).
// Credentials pending: Ring Developer Early Access Program
// (https://developer.amazon.com/ring).

import crypto from 'node:crypto';

export const RING_API_BASE = 'https://api.amazonvision.com';
export const RING_OAUTH_URL = 'https://oauth.ring.com/oauth/token';

/** HMAC signing key. Demo key for v1 (no credentials yet) — override via env. */
export const SIGNING_KEY =
  process.env.RING_HMAC_SIGNING_KEY || 'demo-signing-key-not-for-production';

/**
 * Verify the X-Signature header (hex digest) against the raw body bytes.
 * Uses a timing-safe comparison. Throws on missing/mismatched signature.
 */
export function verifySignature(rawBody, signatureHeader) {
  if (!signatureHeader) {
    const err = new Error('missing X-Signature header');
    err.code = 'missing_signature';
    throw err;
  }
  const expected = crypto
    .createHmac('sha256', SIGNING_KEY)
    .update(rawBody)
    .digest('hex');

  const a = Buffer.from(signatureHeader, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const err = new Error('invalid X-Signature');
    err.code = 'bad_signature';
    throw err;
  }
  return true;
}

/**
 * Parse a verified Ring event into a normalized door event.
 * Returns { kind: 'person_detected' | 'button_press' | 'unknown', device_id, at, raw }
 */
export function parseRingEvent(payload) {
  const data = payload?.data || {};
  const type = data.type;
  const attrs = data.attributes || {};
  const at = data.attributes?.timestamp || payload?.meta?.occurred_at || new Date().toISOString();

  if (type === 'motion_detected' && attrs.sub_type === 'human') {
    return { kind: 'person_detected', device_id: attrs.source || attrs.device_id || null, at, raw: payload };
  }
  if (type === 'button_press') {
    return { kind: 'button_press', device_id: attrs.source || attrs.device_id || null, at, raw: payload };
  }
  return { kind: 'unknown', device_id: attrs.source || null, at, raw: payload };
}

/** Express middleware that keeps the raw body bytes for HMAC verification. */
export function rawBodySaver(req, _res, buf) {
  if (buf && buf.length) req.rawBody = buf;
}
