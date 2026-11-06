/**
 * src/lib/omega/merismos.ts — X77. ΜΕΡΙΣΜΌΣ (merismos), "division into parts".
 * =============================================================================
 *
 * TARGET: WHAT THE FRONTIER LEFT LITERAL ON ITS OWN WIRE
 * ------------------------------------------------------
 * X77 measured, per input class, the MARGINAL RATE
 *
 *     rate = (tokens the frontier saves) / (tokens the ablation saves raw)
 *
 * ~0.1 means the frontier already owns that redundancy; ~1.0 means it is blind to it
 * and pays nearly full price. Measured (bench/x77/t1.ts):
 *
 *     padding             rate 0.11 - 0.49   the frontier OWNS this (X76: do not build here)
 *     punctuation        rate 0.14 - 1.00
 *     long identifiers   rate 0.84           <-- the frontier is BLIND here
 *
 * So the unharvested redundancy is not whitespace any more; it is the CONTENT of long
 * composite identifiers — paths, package names, module names.
 *
 * TWO MEASURED NEGATIVES CAME FIRST, AND THEY ARE WHY THIS CODEC WORKS THE WAY IT DOES
 * ------------------------------------------------------------------------------------
 * (1) SEGMENT INTERNING ON THE RAW TEXT IS WRONG. Splitting long runs on [._/:+-] and
 *     interning the shared segments looked like +2 807 raw tokens over 24 lanes
 *     (bench/x77/t2.ts) — but that measurement omitted the marker that makes decoding
 *     unambiguous. Priced honestly with a marker it is -3 281 (bench/x77/t2b.ts). The
 *     apparent gain was an artefact of bare alphanumeric ids merging into single tokens.
 *
 * (2) REWRITING THE SOURCE INSTEAD OF THE WIRE IS WRONG. The frontier message is what
 *     the decoder reads; rewriting the source compares our output against an
 *     already-compressed baseline and loses by construction (best variant 1 019 tok
 *     against a 367-token frontier on ls-full-iso, bench/x77/t2c.ts). PINAX rewrote
 *     `frontier.message` and MERISMOS does the same.
 *
 * Even then, segment-granular interning on the wire refused on 8/8 lanes: coverage
 * 0.04 - 0.10, and the single lane that cleared coverage LOST (324 vs 300). The
 * frontier has already interned every repeated segment it can see.
 *
 * WHAT IS ACTUALLY LEFT
 * ---------------------
 * Reading the wires (bench/x77/t4.ts) shows why: the frontier interns WHOLE TOKENS,
 * so `baseline-browser-mapping/dist/cli.c` stays literal even though
 * `baseline-browser-mapping` occurs twice. Its dictionary codecs address token
 * boundaries; arbitrary SUBSTRINGS below or across them are never considered.
 *
 * MERISMOS therefore interns ARBITRARY REPEATED SUBSTRINGS of the frontier wire,
 * chosen by measured token gain, using single characters that do not occur on the
 * wire as ids — the frontier's own convention, which is what makes a marker-free id
 * unambiguous. One character per occurrence, no marker, no added punctuation.
 *
 *   LEXIS      interns a whole WORD      (one token -> one id)
 *   SYNIZESIS  interns a whole VALUE     (one cell  -> one id)
 *   MERISMOS   interns any SUBSTRING     (any repeated span -> one id)
 *
 * GREEDY? YES, AND ONLY IN THE SELECTION.
 * ---------------------------------------
 * Candidate generation is a fixed rule: every wire substring of length 4..MAXLEN that
 * occurs >= MIN_OCC times. Selection is a bounded greedy hill-climb over at most
 * GREEDY_ROUNDS rounds, each round adding the single candidate that most reduces the
 * measured token count of the message, stopping when no candidate helps. Every
 * candidate is priced with the real tokenizer, not a proxy, and a round is kept only
 * if it strictly lowers the count — so greedy here cannot lose against the empty table.
 *
 * VERIFICATION (same discipline as PINAX/BRACHYLOGIA)
 * ---------------------------------------------------
 *  GATE 0  data guard    - the contract head must not occur on the wire, and enough
 *                          id characters must be free (absent from the wire).
 *  GATE 1  invertibility - decode(encode(wire)) === wire, byte for byte, or refuse.
 *                          Replacement is a single simultaneous pass, so no cascade.
 *  GATE 2  no self-reference - an id character never occurs inside any replacement
 *                          string, which is what makes a marker-free id unambiguous.
 *  GATE 3  strict win    - countTokens(message) < frontier.messageTokens, or refuse.
 * Gates 1 and 3 are the whole guarantee; nothing is emitted that fails either.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, tagstackFrontier } from './tagstack';
import type { TagstackResult } from './tagstack';

const CONTRACT_HEAD = '§MERISMOS';

/** id characters, in preference order; only ones ABSENT from the wire are used */
const ID_POOL =
  'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('')
    .concat('αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'.split(''))
    .concat(['§', '¶', '†', '‡', '•', '·', '±', '×', '÷', '≠', '∞', '≈', '≤', '≥']);

const MIN_LEN = 4;
const MAX_LEN = 24;
const MIN_OCC = 3;
const MAX_DICT = 30;
const GREEDY_ROUNDS = 10;
const POOL_TOP = 30;

export interface MerismosResult {
  codec: 'merismos';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
  dictSize?: number;
  savedChars?: number;
}

/** Parse the contract line back into id -> substring. */
function parseContract(line: string): Map<string, string> | null {
  if (!line.startsWith(CONTRACT_HEAD)) return null;
  const rest = line.slice(CONTRACT_HEAD.length).trim();
  if (rest === '') return null;
  const m = new Map<string, string>();
  for (const kv of rest.split(' ')) {
    if (kv.length < 3) return null;
    // an id is exactly one character, then '=', then the literal
    m.set(kv[0], kv.slice(2));
  }
  return m;
}

/**
 * Undo MERISMOS. Total: an input without a MERISMOS contract line is returned
 * unchanged. Every id is a single character and ids never occur inside any
 * replacement string (GATE 2), so a single left-to-right pass is exact.
 */
export function merismosDecode(message: string): string {
  const nl = message.indexOf('\n');
  const first = nl === -1 ? message : message.slice(0, nl);
  const body = nl === -1 ? '' : message.slice(nl + 1);
  const dict = parseContract(first);
  if (dict === null || dict.size === 0) return message;
  let out = '';
  for (const ch of body) out += dict.get(ch) ?? ch;
  return out;
}

/** every substring of the wire with its occurrence count, length-bounded */
function ngrams(wire: string): Map<string, number> {
  const counts = new Map<string, number>();
  const n = wire.length;
  for (let i = 0; i + MIN_LEN <= n; i++) {
    const hi = Math.min(MAX_LEN, n - i);
    for (let L = MIN_LEN; L <= hi; L++) {
      const s = wire.substr(i, L);
      const c = counts.get(s);
      if (c === undefined) counts.set(s, 1);
      else counts.set(s, c + 1);
    }
  }
  return counts;
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function merismosEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): MerismosResult {
  const frontier: TagstackResult = frontierFn(text, enc);
  const base = {
    codec: 'merismos' as const,
    decoded: text,
    exact: true,
    applied: false,
    frontierTokens: frontier.messageTokens,
    messageTokens: frontier.messageTokens,
    frontierParent: frontier.parentCodec,
  };
  const refuse = (notes: string): MerismosResult => ({ ...base, message: frontier.message, notes });

  // ---- GATE 0 — data guard -------------------------------------------------
  const wire = frontier.message;
  if (wire.includes(CONTRACT_HEAD)) return refuse('refused: contract head present on wire');
  const present = new Set(wire);
  const freeIds = ID_POOL.filter((c) => !present.has(c));
  if (freeIds.length < 2) return refuse('refused: no free id characters');

  // ---- candidates: fixed rule, every repeated substring ---------------------
  const counts = ngrams(wire);
  // score = occurrences x characters net of the one-character id
  const cands = [...counts.entries()]
    .filter(([s, n]) => n >= MIN_OCC && s.length >= MIN_LEN && !s.includes('\n'))
    .map(([s, n]) => ({ text: s, n, score: n * (s.length - 1) }))
    .sort((a, b) => b.score - a.score || (a.text < b.text ? -1 : 1))
    .slice(0, POOL_TOP);
  if (cands.length === 0) return refuse('refused: no repeated substring');

  const render = (dict: { id: string; text: string }[]) => {
    const map = new Map(dict.map((d) => [d.id, d.text]));
    // ONE simultaneous pass, longest-first, so replacements cannot cascade
    const re = new RegExp(dict.map((d) => escRe(d.text)).join('|'), 'g');
    const body = wire.replace(re, (m) => map.get(m) !== undefined ? (dict.find((d) => d.text === m)!.id) : m);
    // Minimal by measurement. The gloss ("c=text, expand | ") cost ~6 tokens and was the
    // entire barrier: with it the closest candidate was +2..+4 tokens on every lane
    // tested. The frontier's own contract lines are equally terse, and `c=text` is a
    // self-describing shape, so the gloss buys nothing a reader needs.
    const contract = `${CONTRACT_HEAD} ` + dict.map((d) => `${d.id}=${d.text}`).join(' ');
    return { body, contract, message: contract + '\n' + body };
  };
  const price = (dict: { id: string; text: string }[]) => countTokens(render(dict).message, enc);

  const dict: { id: string; text: string }[] = [];
  let best = price(dict); // the frontier message plus an empty contract header
  let used = new Set<string>();
  let closest = Infinity; // how near the best candidate got, for honest reporting
  for (let round = 0; round < GREEDY_ROUNDS && dict.length < MAX_DICT; round++) {
    let bestCand: (typeof cands)[number] | null = null;
    let bestTok = best;
    for (const c of cands) {
      if (used.has(c.text)) continue;
      const trial = dict.concat([{ id: freeIds[dict.length], text: c.text }]);
      // GATE 2 — the id character must not occur inside any replacement string
      if (dict.some((d) => d.text.includes(freeIds[dict.length])) || c.text.includes(freeIds[dict.length])) continue;
      const tok = price(trial);
      if (tok - best < closest) closest = tok - best;
      if (tok < bestTok) { bestTok = tok; bestCand = c; }
    }
    if (bestCand === null) break;
    dict.push({ id: freeIds[dict.length], text: bestCand.text });
    used.add(bestCand.text);
    best = bestTok;
  }
  if (dict.length === 0)
    return refuse(
      `refused: no candidate improves the count (closest was ${closest === Infinity ? 'n/a' : `+${closest}`} tok)`,
    );

  const out = render(dict);

  // ---- GATE 1 — invertibility ----------------------------------------------
  if (merismosDecode(out.message) !== wire) return refuse('refused: invertibility failed');

  // ---- GATE 3 — strict win -------------------------------------------------
  if (!(best < frontier.messageTokens))
    return refuse(`refused: no win (message ${best} >= frontier ${frontier.messageTokens})`);

  const savedChars = dict.reduce((a, d) => a + (d.text.length - 1) * (counts.get(d.text) ?? 0), 0);
  return {
    ...base,
    applied: true,
    message: out.message,
    messageTokens: best,
    dictSize: dict.length,
    savedChars,
    notes: `dict ${dict.length}, message ${frontier.messageTokens}->${best} (${best - frontier.messageTokens})`,
  };
}

/** convenience: encode with the plain frontier, matching the registry contract */
export function merismosWire(text: string, enc: EncodingName = 'o200k_base'): MerismosResult {
  return merismosEncode(text, enc, (t, e) => tagstackEncode(t, e) as TagstackResult);
}
