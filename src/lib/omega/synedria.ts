/**
 * src/lib/omega/synedria.ts
 * =============================================================================
 * SYNEDRIA (συνεδρία — "a sitting together, a council").
 *
 * X114. A scoped, encoder-only cross-parent replay memo for the TAGSTACK
 * frontier. It changes no wire, no contract, no decoder, and no token count.
 * Its only observable effect is wall clock / CPU on inputs whose parents
 * recompute the same deterministic sub-encode from the same fresh work-meter
 * state.
 *
 * ---------------------------------------------------------------------------
 * THE MEASURED SEAM
 * ---------------------------------------------------------------------------
 * `tagstackEncodeInner` measures each parent in its OWN `workEpoch`, but several
 * parents begin with the same expensive call:
 *
 *   synkrisis -> archetypon -> apographeEncode(text) -> ouraEncode(text)
 *   apographe                                            -> ouraEncode(text)
 *   metron    -> apographeEncode(text, {kanon:true})     -> ouraEncode(text)
 *   diastema                                             -> ouraEncode(text)
 *
 * X110 measured the consequence on findmnt: diastema (32.7 s) and apographe
 * (15.4 s) emitted messages byte-identical to synkrisis's (15.8 s); 72% of
 * parent time was duplicate work. The production X74 memo is per-document and
 * does not de-duplicate parents inside one call. ENGRAMMA is a global sub-encode
 * memo and is disabled under the audit flags (`OMEGA_ENGRAM=0`). OURA's X67 memo
 * is global, OURA-only, and disabled under `OMEGA_OURA_MEMO=0`.
 *
 * SYNEDRIA is none of those. It is a council opened for ONE `tagstackEncodeInner`
 * measurement and dissolved when that measurement returns. It remembers exact
 * sub-encode results across the parents sitting in that council, and it replays
 * the counted work rather than skipping it.
 *
 * ---------------------------------------------------------------------------
 * SOUNDNESS: REPLAY, NOT SKIP
 * ---------------------------------------------------------------------------
 * The deterministic work meter (`workmeter.ts`) decides how long later searches
 * run. X67 measured that returning a memoised OURA result for free changed
 * DIASTEMA's wire and made it slower (36.5 s -> 49.9 s). Every SYNEDRIA entry
 * therefore stores the exact `workUsed` and `chironUsedUnits` delta spent by the
 * original computation, and every hit adds those units back with `workConsume` /
 * `chironConsume` before returning a structural clone.
 *
 * A hit is admitted only at the start of a fresh outermost epoch:
 *
 *   depth === 1 && used === 0 && chironUsed === 0
 *
 * and the key contains both budgets, the encoding, the exact text, and the
 * callee's option key. Two such calls are the same pure function of their
 * arguments; any nested or mid-epoch call bypasses the memo and runs normally.
 * This is the same entry-state discipline as X67, but the table is scoped to one
 * frontier council and spans APOGRAPHE and OURA together, so it works under the
 * pinned audit flags that disable the global memos.
 *
 * ---------------------------------------------------------------------------
 * BOUNDS AND FAILURE
 * ---------------------------------------------------------------------------
 * Each council is bounded by entry count and retained key characters; over either
 * bound it clears itself. Results must be `structuredClone`-able or they are not
 * stored. `OMEGA_SYNEDRIA=0` (or `OMEGA_NO_SYNEDRIA=1`) disables it for A/B.
 * There is no clock, no tokenizer call, and no cross-document retention.
 * =============================================================================
 */

import { workState, workConsume, chironConsume, workUsed, chironUsedUnits, type WorkState } from './workmeter';

interface SynedriaEntry {
  work: number;
  chiron: number;
  result: unknown;
}

interface Council {
  table: Map<string, SynedriaEntry>;
  chars: number;
}

const STACK: Council[] = [];

/** Above the largest distinct fresh-parent sub-encode count measured in X110. */
const MAX_ENTRIES = 64;
/** Retained key characters per council; clears rather than growing. */
const MAX_CHARS = 1_000_000;
/** Do not retain document-sized keys. */
const MAX_SOURCE_CHARS = 64 * 1024;

export const synedriaStats = {
  scopes: 0,
  hits: 0,
  misses: 0,
  stores: 0,
  bypassNested: 0,
  bypassDisabled: 0,
  tooBigSkips: 0,
  cloneSkips: 0,
  evictions: 0,
  replayedWork: 0,
  replayedChiron: 0,
};

export function synedriaReset(): void {
  STACK.length = 0;
  synedriaStats.scopes = 0;
  synedriaStats.hits = 0;
  synedriaStats.misses = 0;
  synedriaStats.stores = 0;
  synedriaStats.bypassNested = 0;
  synedriaStats.bypassDisabled = 0;
  synedriaStats.tooBigSkips = 0;
  synedriaStats.cloneSkips = 0;
  synedriaStats.evictions = 0;
  synedriaStats.replayedWork = 0;
  synedriaStats.replayedChiron = 0;
}

export function synedriaDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_SYNEDRIA === '0'
    || process.env?.OMEGA_SYNEDRIA === 'false'
    || process.env?.OMEGA_NO_SYNEDRIA === '1';
}

/** Open one council for a single frontier measurement. Nested councils are independent. */
export function synedriaScope<T>(fn: () => T): T {
  if (synedriaDisabled()) {
    synedriaStats.bypassDisabled++;
    return fn();
  }
  const council: Council = { table: new Map(), chars: 0 };
  STACK.push(council);
  synedriaStats.scopes++;
  try {
    return fn();
  } finally {
    // Pop exactly this council even if a nested callee threw.
    const at = STACK.lastIndexOf(council);
    if (at >= 0) STACK.splice(at, 1);
  }
}

/**
 * Build a key, or return null when the call is not memoisable.
 * `optionsKey` must already be a stable serialisation of everything the callee
 * reads. The budgets are included even though a fresh epoch for the same source
 * length normally implies them, so an explicit `OMEGA_WORK_BUDGET` /
 * `OMEGA_CHIRON_BUDGET` change can never alias.
 */
export function synedriaKey(
  codec: string,
  enc: string,
  text: string,
  optionsKey: string,
  st: WorkState = workState(),
): string | null {
  if (synedriaDisabled() || STACK.length === 0) return null;
  if (st.depth !== 1 || st.used !== 0 || st.chironUsed !== 0) {
    synedriaStats.bypassNested++;
    return null;
  }
  if (text.length === 0) return null;
  if (text.length > MAX_SOURCE_CHARS) {
    synedriaStats.tooBigSkips++;
    return null;
  }
  if (optionsKey.includes('\u0001unserialisable')) return null;
  return `${codec}\u0000${enc}\u0000${st.budget}\u0000${st.chironBudget}\u0000${optionsKey}\u0000${text.length}\u0000${text}`;
}

/** Memoise one fresh-epoch sub-encode inside the current council. */
export function synedriaMemo<T>(key: string | null, run: () => T): T {
  if (key === null || STACK.length === 0) return run();
  const council = STACK[STACK.length - 1]!;
  const hit = council.table.get(key);
  if (hit !== undefined) {
    workConsume(hit.work);
    chironConsume(hit.chiron);
    synedriaStats.hits++;
    synedriaStats.replayedWork += hit.work;
    synedriaStats.replayedChiron += hit.chiron;
    return structuredClone(hit.result) as T;
  }

  synedriaStats.misses++;
  const workBefore = workUsed();
  const chironBefore = chironUsedUnits();
  const result = run();
  const work = workUsed() - workBefore;
  const chiron = chironUsedUnits() - chironBefore;

  let copy: unknown;
  try {
    copy = structuredClone(result);
  } catch {
    synedriaStats.cloneSkips++;
    return result;
  }
  if (council.table.size >= MAX_ENTRIES) {
    council.table.clear();
    council.chars = 0;
    synedriaStats.evictions++;
  }
  council.table.set(key, { work, chiron, result: copy });
  council.chars += key.length;
  synedriaStats.stores++;
  if (council.chars > MAX_CHARS) {
    council.table.clear();
    council.chars = 0;
    synedriaStats.evictions++;
  }
  return result;
}
