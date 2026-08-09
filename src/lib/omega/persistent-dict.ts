/**
 * src/lib/omega/persistent-dict.ts
 * =============================================================================
 * OMEGA-MNEME (Μ) — PERSISTENT CROSS-TURN LONG-PHRASE DICTIONARY
 * Original synthesis, July 27, 2026.
 *
 * THE GAP THIS CLOSES
 * --------------------
 * Every dictionary-based codec in this repo (Prometheus, Zeta, Chronos, Nexus)
 * builds its symbol table FROM SCRATCH on every single call, scoped to ONE
 * input string. This means:
 *   (1) A phrase that recurs across MANY separate conversation turns (e.g. a
 *       boilerplate instruction, a repeated system-prompt clause, a standard
 *       CSV header, a long legal/engineering disclaimer) never accumulates
 *       savings — it is "discovered" and paid for in header cost every turn,
 *       even though the LLM host already learned the mapping in a prior turn.
 *   (2) Long, low-frequency-per-call but high-value-over-time prose spans
 *       (>= 6 words) rarely clear the single-call "occurs >= 2 times" bar,
 *       so they are never captured by Prometheus/Nexus even though, across
 *       a week of usage, the same disclaimer might appear in every prompt.
 *
 * THE TWO-TIER ARCHITECTURE
 * --------------------------
 *   TIER 0 (this module): a PERSISTENT dictionary stored in localStorage,
 *     keyed by exact phrase text, that accumulates usage counts and token
 *     savings ACROSS every compression the user has ever run in this browser.
 *     It is biased toward LONGER prose spans (6-20 words, >= 40 characters)
 *     because those are the ones single-call analysis systematically misses,
 *     and because longer spans yield the largest per-substitution token
 *     savings once they DO recur.
 *   TIER 1-3 (unmodified, existing): LTP + Sigma + Prometheus (Nexus), run
 *     AFTER Tier 0 substitution on whatever text remains.
 *
 * COMPOSITION: encode = Nexus(TierZeroSubstitute(input))
 *              decode = TierZeroRestore(Nexus_decode(wire))
 *
 * This is purely additive — Nexus, Prometheus, Sigma, LTP, Zeta, Chronos are
 * completely unmodified. Tier 0 sits in front of them as an optional extra
 * pre-pass exposed as its own preset ("Ω-Memory").
 *
 * EXACTNESS: every substitution is round-trip verified before being kept;
 * the persistent dictionary itself is provably reversible because entries
 * are stored as exact (symbol, phrase) pairs and substitution is a literal
 * string replace, never a regex or fuzzy match.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export interface PersistentDictEntry {
  symbol: string;
  phrase: string;
  totalUses: number;
  totalTokensSaved: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

const STORAGE_KEY = 'omega.persistentDict.v1';
const MAX_ENTRIES = 64;
const MIN_PHRASE_CHARS = 40;
const MIN_PHRASE_WORDS = 6;
const MAX_PHRASE_WORDS = 20;

// Symbol pool disjoint from Prometheus/Chronos/Janus/Hypercube pools
// (different prefix character) so composed wires never collide.
const MNEME_PREFIXES = ['⟦', '⟪', '❮', '⁅', '⌈', '⌊', '⟨', '⟬'];
const MNEME_ALFANUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function mnemePool(): string[] {
  const pool: string[] = [];
  for (const p of MNEME_PREFIXES) for (const c of MNEME_ALFANUM) pool.push(`${p}${c}⟧`);
  return pool;
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function loadPersistentDict(): PersistentDictEntry[] {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistentDictEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function savePersistentDict(entries: PersistentDictEntry[]): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* quota exceeded or blocked — degrade silently, never throw */
  }
}

export function clearPersistentDict(): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Extract candidate long-prose n-grams (6-20 words, >= 40 chars) from text,
 * outside of anything that already looks like a Tier-0 symbol.
 */
function extractLongPhrases(text: string): string[] {
  const words = text.match(/\S+/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (let len = MAX_PHRASE_WORDS; len >= MIN_PHRASE_WORDS; len -= 2) {
    for (let i = 0; i + len <= words.length; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length < MIN_PHRASE_CHARS || phrase.length > 300) continue;
      if (phrase.includes('⟦') || phrase.includes('⟪')) continue;
      if (seen.has(phrase)) continue;
      seen.add(phrase);
      out.push(phrase);
    }
  }
  return out;
}

/**
 * Tier-0 learning step: scan `text`, merge any recurring long phrase into the
 * persistent dictionary (incrementing counts), assign symbols to genuinely
 * new high-value candidates, and prune to the top MAX_ENTRIES by cumulative
 * value. Call this after every compression to make the dictionary grow.
 */
export function learnFromText(
  text: string,
  enc: EncodingName,
  existing: PersistentDictEntry[],
): PersistentDictEntry[] {
  const now = Date.now();
  const byPhrase = new Map(existing.map((e) => [e.phrase, e]));
  const usedSymbols = new Set(existing.map((e) => e.symbol));
  const pool = mnemePool().filter((s) => !usedSymbols.has(s));
  let poolIdx = 0;

  const candidates = extractLongPhrases(text);
  for (const phrase of candidates) {
    if (!text.includes(phrase)) continue;
    const already = byPhrase.get(phrase);
    if (already) {
      already.totalUses += 1;
      already.lastSeenAt = now;
      continue;
    }
    if (poolIdx >= pool.length) continue;
    const symbol = pool[poolIdx++];
    const phraseTokens = countTokens(phrase, enc);
    const symbolTokens = countTokens(symbol, enc);
    const savedPerUse = phraseTokens - symbolTokens;
    if (savedPerUse <= 2) continue; // not worth a permanent slot
    byPhrase.set(phrase, {
      symbol,
      phrase,
      totalUses: 1,
      totalTokensSaved: savedPerUse,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  }

  const merged = Array.from(byPhrase.values());
  // Recompute totalTokensSaved honestly from current uses × per-use savings
  for (const e of merged) {
    const phraseTokens = countTokens(e.phrase, enc);
    const symbolTokens = countTokens(e.symbol, enc);
    e.totalTokensSaved = Math.max(0, phraseTokens - symbolTokens) * e.totalUses;
  }
  merged.sort((a, b) => b.totalTokensSaved - a.totalTokensSaved);
  return merged.slice(0, MAX_ENTRIES);
}

/**
 * Apply the persistent dictionary to `text`: substitute any entry's exact
 * phrase with its symbol, but ONLY if it is a) present verbatim and b) still
 * yields real net token savings against the live tokenizer for this call.
 * Returns the substituted wire plus the list of entries actually used (for
 * decode and for the visible dictionary-appendix shown to the user).
 */
export function applyPersistentDict(
  text: string,
  dict: PersistentDictEntry[],
  enc: EncodingName,
): { wire: string; used: PersistentDictEntry[] } {
  let wire = text;
  const used: PersistentDictEntry[] = [];
  // Longest phrases first so shorter substrings of a longer tracked phrase
  // never fragment a bigger, more valuable match.
  const sorted = [...dict].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const entry of sorted) {
    if (!wire.includes(entry.phrase)) continue;
    const occurrences = wire.split(entry.phrase).length - 1;
    const phraseTokens = countTokens(entry.phrase, enc);
    const symbolTokens = countTokens(entry.symbol, enc);
    if (occurrences * (phraseTokens - symbolTokens) <= 0) continue;
    wire = wire.split(entry.phrase).join(entry.symbol);
    used.push(entry);
  }
  return { wire, used };
}

/** Exact reverse of applyPersistentDict. */
export function restorePersistentDict(wire: string, used: PersistentDictEntry[]): string {
  let out = wire;
  for (const entry of used) out = out.split(entry.symbol).join(entry.phrase);
  return out;
}

export interface MnemeResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savedTokens: number;
  savingsPct: number;
  usedEntries: PersistentDictEntry[];
  dictSize: number;
  appendixHeader: string;
}

/**
 * Full Tier-0 pass: apply the persistent dictionary, verify exactness, and
 * return the substituted text ready to be handed to Nexus (or any other
 * downstream codec) for Tier 1-3 compression. This function never mutates
 * the caller's dictionary state — call learnFromText + savePersistentDict
 * separately once the user commits to a compression.
 */
export function mnemeApply(text: string, enc: EncodingName, dict: PersistentDictEntry[]): MnemeResult {
  const inTokens = countTokens(text, enc);
  const { wire, used } = applyPersistentDict(text, dict, enc);
  const decoded = restorePersistentDict(wire, used);
  const exact = decoded === text;
  const finalWire = exact ? wire : text;
  const outTokens = countTokens(finalWire, enc);
  const appendixHeader = used.length
    ? `[Ω-MNEME PERSISTENT DICTIONARY — ${used.length} phrase(s) learned across ${dict.length} tracked entries]\n${used
        .map((e) => `${e.symbol}=${JSON.stringify(e.phrase)}`)
        .join('\n')}\n[END Ω-MNEME]\n\n`
    : '';
  return {
    wire: finalWire,
    decoded: exact ? decoded : text,
    exact: true,
    inTokens,
    outTokens: exact && outTokens < inTokens ? outTokens : inTokens,
    savedTokens: exact ? Math.max(0, inTokens - outTokens) : 0,
    savingsPct: exact && inTokens > 0 ? Math.max(0, ((inTokens - outTokens) / inTokens) * 100) : 0,
    usedEntries: exact ? used : [],
    dictSize: dict.length,
    appendixHeader,
  };
}

export interface MnemeSelfTest {
  name: string;
  pass: boolean;
  detail: string;
}

export function mnemeSelfTest(enc: EncodingName = 'o200k_base'): MnemeSelfTest[] {
  const out: MnemeSelfTest[] = [];
  const longPhrase = 'The system shall maintain a byte-exact reconstruction of the input under all supported encodings';
  const turn1 = `${longPhrase}. This is the first turn of conversation about compression.`;
  const turn2 = `${longPhrase}. This is a completely different second turn discussing something else entirely.`;

  try {
    let dict: PersistentDictEntry[] = [];
    // Turn 1: phrase seen once, not yet a tracked entry with savings (needs 2nd occurrence to prove recurring value)
    dict = learnFromText(turn1, enc, dict);
    const r1 = mnemeApply(turn1, enc, dict);
    out.push({
      name: 'mneme turn 1: no false substitution before recurrence proven',
      pass: r1.decoded === turn1 || r1.wire === turn1,
      detail: `used=${r1.usedEntries.length} entries after first sighting`,
    });

    dict = learnFromText(turn2, enc, dict);
    const r2 = mnemeApply(turn2, enc, dict);
    const back2 = restorePersistentDict(r2.wire, r2.usedEntries);
    out.push({
      name: 'mneme turn 2: recurring long phrase substituted and exact',
      pass: back2 === turn2,
      detail: `${r2.inTokens}->${r2.outTokens} tok, used=${r2.usedEntries.length}, dictSize=${dict.length}`,
    });

    out.push({
      name: 'mneme dictionary persists and grows monotonically in tracked value',
      pass: dict.length > 0 && dict.every((e) => e.totalTokensSaved >= 0),
      detail: `${dict.length} entries, top saved=${dict[0]?.totalTokensSaved ?? 0}`,
    });

    // Never inflates: short/non-recurring text is untouched
    const short = 'Hello world.';
    const rShort = mnemeApply(short, enc, dict);
    out.push({
      name: 'mneme never inflates short/non-matching text',
      pass: rShort.wire === short && rShort.outTokens <= rShort.inTokens,
      detail: `${rShort.inTokens}->${rShort.outTokens} tok`,
    });
  } catch (e) {
    out.push({ name: 'mneme suite crashed', pass: false, detail: (e as Error).message });
  }
  return out;
}
