/**
 * src/lib/omega/engram.ts
 * =============================================================================
 * ENGRAMMA (ἔγγραμμα — "that which is written in, a record, a memorial").
 *
 * X68. The TAGSTACK frontier measures eight in-band parents on every input and
 * keeps the cheapest complete message. Measured on
 * `bench/holdout-tbl/psql-output.txt` (1,578 chars, 675 raw o200k tokens) the
 * frontier makes **95 calls to `daedalusEncode`** for one message, pushing
 * **118,182 characters** through DAEDALUS (75x the size of the source) — and
 * only ~35 of those call keys are distinct. The same held-out text is re-encoded
 * by SYNKRISIS, by KANON, by APOGRAPHE, by METRON and by DIASTEMA, each of which
 * reaches DAEDALUS/CHIRON through its own wrapper chain. That redundancy is
 * pure cost: it cannot change the answer, because DAEDALUS is a deterministic
 * function of (text, encoding, options) *given the same counted-work state*.
 *
 * This module is that statement, made executable. It memoises a sub-encode on
 * the exact triple (codec, encoding, options, text) and returns a structural
 * clone of the earlier result.
 *
 * ---------------------------------------------------------------------------
 * THE SOUNDNESS TRAP, AND WHY IT IS NOT REPEATED HERE  (X67's finding)
 * ---------------------------------------------------------------------------
 * X67 shipped an entry-state memo (`bench/x67/oura-memo.ts`) and hit a real bug:
 * caching only the RESULT is unsound, because the deterministic work meter
 * (`workmeter.ts`) hands each encode a bounded allowance of search
 * evaluations. If a cache hit skips the search it must also skip the
 * *accounting*, or the hit hands its caller free budget and later searches in
 * the same epoch run longer than they would have. Measured in X67: DIASTEMA
 * went 36.5 s -> 49.9 s (slower with the cache ON) and METRON stopped reporting
 * `bound`.
 *
 * ENGRAMMA therefore replays the spend. Every entry stores the exact
 * `workmeter` and `chiron` units the original computation consumed, measured as
 * the delta across the memoised region, and every hit adds exactly those units
 * back with `workConsume` / `chironConsume`. A hit is then *observationally
 * identical* to the computation, not merely equal in its result: the meter
 * reads the same value afterwards, so every later budget decision in the same
 * epoch is the same decision.
 *
 * Two further conditions make the replay well defined:
 *   - The memo is consulted INSIDE the callee's own `workEpoch` window (see the
 *     call sites in `daedalus.ts` and `apographe.ts`), so on an outermost call
 *     the window starts at `used = 0` and the measured delta is the whole spend;
 *     on a nested call the window is the caller's and the delta is the nested
 *     spend. Either way the delta is the right number to replay into the epoch
 *     that is currently open.
 *   - The options object is part of the key, serialised with sorted keys. A
 *     different `budgetMs` or a different arm set is a different key, so a hit
 *     can never substitute a result produced under different search conditions.
 *
 * Nothing here can change a token count. A hit returns the object the
 * computation returned; the metric is wall clock. The identity receipts are
 * `bench/x68/receipts/*.json` (complete-message SHA-256 compared with the memo
 * off in the same process).
 *
 * Cost: one string key per lookup. The key embeds the text, so V8's per-string
 * hash cache makes repeat lookups O(1) after the first. Bounded by entry count
 * AND by retained key characters; over either bound the table is cleared, so a
 * pathological input cannot grow it without limit. `OMEGA_ENGRAM=0` disables it.
 * =============================================================================
 */

import { workConsume, chironConsume, workUsed, chironUsedUnits } from './workmeter';

interface EngramEntry {
  work: number;
  chiron: number;
  result: unknown;
}

/** codec \0 encoding \0 options \0 text -> entries (a list keeps the key unique) */
const TABLE = new Map<string, EngramEntry>();
let retainedChars = 0;

/** 256 entries is above the largest distinct-call count measured on any lane
 *  (35 on psql-output, 62 on license.txt through the whole frontier chain). */
const MAX_ENTRIES = 256;
/** A 64 KB source is far beyond the point where re-encoding dominates; above it
 *  the memo is bypassed so the table cannot retain document-sized keys. */
const MAX_SOURCE_CHARS = 64 * 1024;
/** Only memoise computations that actually cost something. Below this the key is
 *  more expensive than the work it saves. */
const MIN_WORK = 2_000;

export const engramStats = {
  hits: 0,
  misses: 0,
  stores: 0,
  cheapSkips: 0,
  tooBigSkips: 0,
  replayedWork: 0,
  replayedChiron: 0,
  evictions: 0,
};

export function engramClear(): void {
  TABLE.clear();
  retainedChars = 0;
  engramStats.hits = 0;
  engramStats.misses = 0;
  engramStats.stores = 0;
  engramStats.cheapSkips = 0;
  engramStats.tooBigSkips = 0;
  engramStats.replayedWork = 0;
  engramStats.replayedChiron = 0;
  engramStats.evictions = 0;
}

export function engramSize(): number {
  return TABLE.size;
}

/** Stable serialisation of an options object: sorted keys, undefined dropped. */
export function engramOptionsKey(options: unknown): string {
  if (options === undefined || options === null) return '';
  if (typeof options !== 'object') return String(options);
  const o = options as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  if (!keys.length) return '';
  try {
    return JSON.stringify(keys.map((k) => [k, o[k]]));
  } catch {
    return '\u0001unserialisable';
  }
}

function engramDisabled(): boolean {
  return typeof process !== 'undefined' && process.env?.OMEGA_ENGRAM === '0';
}

/**
 * Memoise a deterministic sub-encode. `run` must be a pure function of
 * (codec, enc, text, options) *plus* the counted-work state it starts in; the
 * call must sit inside the callee's work epoch.
 */
export function engramMemo<T>(
  codec: string,
  enc: string,
  text: string,
  optionsKey: string,
  run: () => T,
): T {
  if (engramDisabled() || text.length === 0) return run();
  if (text.length > MAX_SOURCE_CHARS) {
    engramStats.tooBigSkips++;
    return run();
  }
  const key = codec + '\u0000' + enc + '\u0000' + optionsKey + '\u0000' + text;
  const hit = TABLE.get(key);
  if (hit !== undefined) {
    workConsume(hit.work);
    chironConsume(hit.chiron);
    engramStats.hits++;
    engramStats.replayedWork += hit.work;
    engramStats.replayedChiron += hit.chiron;
    return structuredClone(hit.result) as T;
  }

  engramStats.misses++;
  const workBefore = workUsed();
  const chironBefore = chironUsedUnits();
  const result = run();
  const work = workUsed() - workBefore;
  const chiron = chironUsedUnits() - chironBefore;
  if (work < MIN_WORK) {
    engramStats.cheapSkips++;
    return result;
  }
  // Validate that the result can be replayed before promising a hit.
  let copy: unknown;
  try {
    copy = structuredClone(result);
  } catch {
    engramStats.cheapSkips++;
    return result;
  }
  if (TABLE.size >= MAX_ENTRIES) {
    TABLE.clear();
    retainedChars = 0;
    engramStats.evictions++;
  }
  TABLE.set(key, { work, chiron, result: copy });
  retainedChars += key.length;
  engramStats.stores++;
  if (retainedChars > 4_000_000) {
    TABLE.clear();
    retainedChars = 0;
    engramStats.evictions++;
  }
  return result;
}
