import axios from 'axios';
import { timingSafeEqual } from 'crypto';

/**
 * Groq client with automatic multi-key failover.
 *
 * Keys are read once at module load from the environment:
 *   - GROQ_API_KEYS  : comma-separated list (primary)
 *   - GROQ_API_KEY   : single key (backward-compatible fallback)
 *
 * Both are merged, de-duplicated and placeholder values are skipped.
 *
 * On a failed request the offending key is put in a cooldown so subsequent
 * calls skip it automatically:
 *   - 401 / 403 (invalid / expired / revoked)  -> 1 hour cooldown
 *   - 429 (rate limited)                      -> honour `retry-after`, else 60s
 *   - 5xx (server error)                      -> short backoff, a few retries
 *
 * Calls rotate across available keys round-robin so load is spread, and a
 * call that fails on one key is retried on the next until one succeeds or all
 * keys are unavailable.
 *
 * NOTE: cooldown state lives in module memory. In a long-running Node server
 * it persists across requests; in serverless it resets per cold start but
 * per-request failover still works.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PLACEHOLDER = 'your_groq_api_key_here';

// ─── Key validation ──────────────────────────────────────────────────────
function isValidKey(key: string | undefined): key is string {
  if (!key) return false;
  if (key === PLACEHOLDER) return false;
  if (key.length <= 10) return false;
  try {
    return !timingSafeEqual(Buffer.from(key), Buffer.from(PLACEHOLDER));
  } catch {
    return true;
  }
}

// ─── Key pool state ──────────────────────────────────────────────────────
interface KeyState {
  key: string;
  cooldownUntil: number; // epoch ms; 0 = available
  consecutive5xx: number; // transient backoff counter
}

const MS_HOUR = 60 * 60 * 1000;
const MS_MINUTE = 60 * 1000;

function loadKeys(): string[] {
  const keys: string[] = [];

  const multi = process.env.GROQ_API_KEYS;
  if (multi) {
    for (const k of multi.split(',')) {
      const trimmed = k.trim();
      if (isValidKey(trimmed) && !keys.includes(trimmed)) keys.push(trimmed);
    }
  }

  const single = process.env.GROQ_API_KEY;
  if (isValidKey(single) && !keys.includes(single)) keys.push(single);

  return keys;
}

const keyStates: KeyState[] = loadKeys().map((key) => ({
  key,
  cooldownUntil: 0,
  consecutive5xx: 0,
}));

// Round-robin pointer so successive calls start on different keys.
let roundRobin = 0;

// ─── Public API ──────────────────────────────────────────────────────────

/** True if at least one valid Groq key is configured. */
export function hasGroqKey(): boolean {
  return keyStates.length > 0;
}

export interface GroqChatBody {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

export interface GroqCallError extends Error {
  status?: number;
  allKeysExhausted?: boolean;
}

// ─── Internal helpers ────────────────────────────────────────────────────

/** Build the ordered list of keys to try for this call, skipping cooled-down ones. */
function candidateKeys(): KeyState[] {
  const now = Date.now();
  const available: KeyState[] = [];
  for (let i = 0; i < keyStates.length; i++) {
    const idx = (roundRobin + i) % keyStates.length;
    if (keyStates[idx].cooldownUntil <= now) available.push(keyStates[idx]);
  }
  // Advance the round-robin past the first candidate so the next call
  // starts on the following key (spreads load across keys).
  if (available.length > 0) {
    const firstIdx = keyStates.indexOf(available[0]);
    roundRobin = (firstIdx + 1) % keyStates.length;
  }
  return available;
}

/** Put a key into cooldown based on the failure type. */
function markFailed(st: KeyState, status: number, retryAfterHeader?: string): void {
  if (status === 401 || status === 403) {
    // Invalid / expired / revoked — unlikely to recover soon.
    st.cooldownUntil = Date.now() + MS_HOUR;
    st.consecutive5xx = 0;
    return;
  }
  if (status === 429) {
    // Rate limited — honour retry-after if present (in seconds).
    let ms = MS_MINUTE;
    const ra = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
    if (!Number.isNaN(ra) && ra > 0) ms = Math.min(Math.max(ra, 1), 3600) * 1000;
    st.cooldownUntil = Date.now() + ms;
    st.consecutive5xx = 0;
    return;
  }
  if (status >= 500) {
    // Transient server error — short backoff with a few same-key retries.
    st.consecutive5xx += 1;
    st.cooldownUntil = Date.now() + Math.min(st.consecutive5xx * 2000, 30000);
    return;
  }
  // Any other failure — short cooldown.
  st.cooldownUntil = Date.now() + 30 * 1000;
}

function makeError(message: string, status: number, allKeysExhausted: boolean): GroqCallError {
  const err = new Error(message) as GroqCallError;
  err.status = status;
  err.allKeysExhausted = allKeysExhausted;
  return err;
}

/** Minimal structural shape of an axios error we care about. */
interface AxiosLikeError {
  response?: {
    status?: number;
    headers?: { 'retry-after'?: string };
    data?: { error?: { message?: string }; message?: string };
  };
  code?: string;
}

function asAxiosError(error: unknown): AxiosLikeError {
  return error as AxiosLikeError;
}

function upstreamMessage(error: unknown): string {
  const e = asAxiosError(error);
  return (
    e?.response?.data?.error?.message ||
    e?.response?.data?.message ||
    (e?.code ? `Request failed: ${e.code}` : 'Groq request failed')
  );
}

// ─── Main entry point ────────────────────────────────────────────────────

/**
 * Call the Groq chat completions endpoint, automatically rotating across all
 * configured keys and applying cooldowns on auth / rate-limit failures.
 *
 * Returns the assistant message content string.
 * Throws GroqCallError if no keys are configured, all are in cooldown, or the
 * request is malformed (4xx other than 429).
 */
export async function callGroq(body: GroqChatBody): Promise<string> {
  if (keyStates.length === 0) {
    throw makeError('No Groq API keys configured', 500, true);
  }

  const candidates = candidateKeys();
  if (candidates.length === 0) {
    throw makeError(
      'All Groq API keys are temporarily unavailable (rate-limited or expired)',
      503,
      true,
    );
  }

  let lastError: unknown = null;

  for (const st of candidates) {
    try {
      const res = await axios.post(GROQ_API_URL, body, {
        headers: {
          Authorization: `Bearer ${st.key}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000, // generous; large completions can take a while
      });
      st.consecutive5xx = 0;
      return res.data.choices[0].message.content;
    } catch (error) {
      lastError = error;
      const e = asAxiosError(error);
      const status = e?.response?.status;
      if (status) {
        markFailed(st, status, e?.response?.headers?.['retry-after']);
      }

      // 4xx (except 429) means the request itself is bad — another key
      // won't help, so surface the error immediately.
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw makeError(upstreamMessage(error), status, false);
      }

      // 429 / 5xx / network error — rotate to the next key.
    }
  }

  // Every available key failed.
  throw makeError(
    lastError ? upstreamMessage(lastError) : 'All Groq API keys failed',
    asAxiosError(lastError)?.response?.status || 503,
    true,
  );
}
