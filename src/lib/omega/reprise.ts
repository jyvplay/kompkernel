/**
 * REPRISE — bounded exact memoization of complete TAGSTACK frontier results.
 *
 * This is a runtime-speed codec, not a new textual compression transform: the
 * returned chat message is exactly the TAGSTACK message (same in-band reader,
 * byte-exact decoder, and measured token count). If the identical source and
 * relevant search configuration are encoded again in this process, reuse the
 * previous complete measurement instead of re-running every parent.
 *
 * The cache is encoder-only. Nothing about decoding depends on it; each cached
 * value is a complete, self-contained TAGSTACK message. Misses follow the
 * ordinary TAGSTACK path. Entries are retained only for exact, complete,
 * bounded results and are evicted by LRU under both entry and character caps.
 */
import { tagstackEncode, type TagstackResult } from './tagstack';
import type { EncodingName } from './bpe';

export const REPRISE_MAX_SOURCE_CHARS = 50_000;
export const REPRISE_MAX_ENTRIES = 8;
export const REPRISE_MAX_RETAINED_CHARS = 500_000;

interface Entry { source: string; result: TagstackResult; retainedChars: number }
const cache = new Map<string, Entry>();
let retainedChars = 0;
let hits = 0;
let misses = 0;
let bypasses = 0;

function configKey(enc: EncodingName): string {
  const e = typeof process !== 'undefined' ? process.env : undefined;
  // These are the search controls read by TAGSTACK's measured parents.
  return JSON.stringify([enc, e?.OMEGA_DET ?? null, e?.OMEGA_WORK_BUDGET ?? null,
    e?.OMEGA_CHIRON_BUDGET ?? null]);
}

function cloneWithMs(result: TagstackResult, ms: number): TagstackResult {
  return { ...result, ms, frontierCosts: { ...result.frontierCosts },
    frontierReportedCosts: { ...result.frontierReportedCosts } };
}

function weight(source: string, result: TagstackResult): number {
  return source.length + result.message.length + result.wire.length + result.decoded.length
    + (result.candidateMessage?.length ?? 0);
}

function evictOldest(): void {
  const oldest = cache.entries().next().value as [string, Entry] | undefined;
  if (!oldest) return;
  cache.delete(oldest[0]);
  retainedChars -= oldest[1].retainedChars;
}

export interface RepriseStats {
  entries: number; retainedChars: number; hits: number; misses: number; bypasses: number;
}

/** Encode with TAGSTACK, reusing only an exact prior complete result. */
export function repriseEncode(text: string, enc: EncodingName = 'o200k_base'): TagstackResult {
  const t0 = Date.now();
  if (text.length > REPRISE_MAX_SOURCE_CHARS) {
    bypasses++;
    return tagstackEncode(text, enc);
  }
  const cfg = configKey(enc);
  const key = `${cfg}\u0000${text}`;
  const hit = cache.get(key);
  if (hit?.source === text) {
    cache.delete(key);
    cache.set(key, hit);
    hits++;
    return cloneWithMs(hit.result, Date.now() - t0);
  }
  misses++;
  const result = tagstackEncode(text, enc);
  if (!result.exact || !result.frontierComplete) return result;
  // The map key includes its own copy of the source string, so budget it too.
  const retained = weight(text, result) + key.length;
  if (retained > REPRISE_MAX_RETAINED_CHARS) { bypasses++; return result; }
  const existing = cache.get(key);
  if (existing) { cache.delete(key); retainedChars -= existing.retainedChars; }
  const entry: Entry = { source: text, result: cloneWithMs(result, result.ms), retainedChars: retained };
  cache.set(key, entry);
  retainedChars += retained;
  while (cache.size > REPRISE_MAX_ENTRIES || retainedChars > REPRISE_MAX_RETAINED_CHARS) evictOldest();
  return result;
}

export function repriseCacheStats(): RepriseStats {
  return { entries: cache.size, retainedChars, hits, misses, bypasses };
}

/** Test/long-lived worker hook; clearing affects speed only, never wire semantics. */
export function repriseCacheClear(): void {
  cache.clear(); retainedChars = 0; hits = 0; misses = 0; bypasses = 0;
}
