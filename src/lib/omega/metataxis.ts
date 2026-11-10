/**
 * X97 — ΜΕΤΑΤΑΞΙΣ (metataxis, "rearrangement").
 *
 * ============================================================================
 * THE MECHANISM, AND WHY IT IS NOT ἸΣΟΜΟΡΦΊΑ
 * ============================================================================
 *
 * A CHIRON wire is `contract § k₁v₁ k₂v₂ … kₙvₙ ¶ body`, where the tape is
 * DELIMITER-FREE: each entry is one new letter followed by its value, and the
 * entries are simply concatenated.  The decoder does not care what order the
 * entries are in, provided every rule still appears after the rules it
 * references.  So the tape has TWO free parameters that the shipped search never
 * priced against the message metric:
 *
 *   1. which letter each rule gets  — ἸΣΟΜΟΡΦΊΑ searches this (single-letter moves)
 *   2. WHICH SLOT each rule occupies — ἸΣΟΜΟΡΦΊΑ searches this only by ADJACENT
 *      transpositions, and ARIADNE's four move types do not touch it at all
 *
 * Parameter 2 is not cosmetic.  Because the tape is delimiter-free, the
 * tokenizer sees `…vᵢkᵢ₊₁vᵢ₊₁…` as one stream, and whether `vᵢ`'s last
 * characters fuse with `kᵢ₊₁` — and whether `vᵢ₊₁`'s first characters fuse with
 * `kᵢ₊₂` — depends entirely on which rules are neighbours.  Moving a rule to an
 * arbitrary valid slot changes up to n−1 of those boundaries at once, which no
 * adjacent swap can do.
 *
 * MEASURED (bench/x97/receipts/moves.json, ten authoritative wires, whole-message
 * priced, `chironDecode` verified):
 *
 *   adjacent swaps only (ἸΣΟΜΟΡΦΊΑ's move)      −11
 *   ARBITRARY-RANK RELOCATION (this codec)       −62   at 16 000 probes
 *                                                  −45   at  1 000 probes
 *                                                  −30   at    250 probes
 *
 * So the larger neighbourhood is worth 5.6× the smaller one on the same wires,
 * and it has not saturated.
 *
 * ============================================================================
 * IS IT GREEDY?
 * ============================================================================
 *
 * YES — a seeded, stochastic, first-improvement hill-climb with a fixed
 * deterministic probe budget.  It never backtracks and never considers the joint
 * optimum.  Its single move type is:
 *
 *   RELOCATE — take the rule at tape position `a` and re-insert it at position
 *   `p` (any p ≠ a, a+1), which is legal exactly when every rule it references
 *   still precedes it and every rule referencing it still follows it.
 *
 * ============================================================================
 * SOURCE ARTICLE
 * ============================================================================
 *
 * NONE for the mechanism.  This is original engineering of this repository.  The
 * framing is borrowed, and only the framing:
 *   - ACL 2024.emnlp-main.40 (PathPiece): a code assignment is optimal only
 *     relative to the tokenizer that prices it, so the tape's serialisation is a
 *     free parameter rather than a fixed convention.
 *   - arXiv:2602.22958 (Frequency-Ordered Tokenization): renumbering a code
 *     assignment is a compression lever independent of the code set.
 * Neither paper considers the ORDER of a grammar's rules, and neither considers a
 * delimiter-free tape whose entry boundaries are invisible to the tokenizer.
 *
 * ============================================================================
 * TIME- OR CPU-BOUND?
 * ============================================================================
 *
 * CPU-BOUND, deliberately and reproducibly: the budget is a pure function of the
 * message length, there is no wall-clock term anywhere, and every candidate is
 * priced with `countTokens` on the COMPLETE message.  (`countTokens` is the
 * repository's standard metric and is asserted equal to `countTokensExact` by
 * `verifyChunkAlgebra`; measured equal on all ten committed messages,
 * bench/x97/receipts/eq.log.  It is also chunk-cached, and a relocation leaves
 * the body byte-identical, so the body's chunks are cache hits — which is why
 * this pass is affordable at tens of thousands of probes.)
 *
 * This pass needs NO letter pool, because it never changes a letter.  That is the
 * reason it is strictly cheaper than the pass it generalises: ἸΣΟΜΟΡΦΊΑ builds the
 * incumbent script's full one-token pool before its first probe (20 742
 * `countTokensExact` calls for a CJK tape) and ΜΕΤΑΤΑΞΙΣ builds nothing.
 *
 * ============================================================================
 * FIDELITY
 * ============================================================================
 *
 * A relocation is a permutation of the tape's entries, so it preserves the
 * rule→letter map exactly.  Keys stay distinct, the first letter still declares
 * the same script (every letter is unchanged), and the DAG check keeps every
 * reference pointing at a strictly earlier rule, so `chironDecode`'s forward-
 * reference guard still passes and expansion terminates.  Expansion composes with
 * the permutation, so the decoded string is byte-identical.  This is a PROOF, and
 * the pass re-decodes every candidate through `chironDecode` anyway.
 */
import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from './chiron';

export interface MetataxisResult {
  applied: boolean;
  message: string;
  messageTokens: number;
  decoded: string;
  notes: string;
}

/**
 * Default probe budget.  Not a guess: bench/x97/receipts/moves.json prices the
 * relocation lever at 250 / 1 000 / 4 000 / 16 000 probes and gets −30 / −45 /
 * −58 / −62 over the ten committed wires, with the largest lane (ls-l-real,
 * 143 rules) still improving at the 16 000 cap.  The budget below is a pure
 * function of the message length, so the same input always yields the same wire.
 */
export const METATAXIS_ITERS = 24000;

/** `OMEGA_NO_METATAXIS=1` skips the pass entirely, for an honest interleaved A/B. */
export function metataxisDisabled(): boolean {
  return typeof process !== 'undefined' && process.env?.OMEGA_NO_METATAXIS === '1';
}

/** Stop after this many probes without an improvement (bounds the confirmation sweep). */
const PATIENCE = 3;
/** Cap on the deterministic probe budget, whatever the message length. */
const MAX_PROBES = 30000;
/** Floor, so a tiny message still gets a real search. */
const MIN_PROBES = 4000;

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (Math.imul(t ^ (t >>> 7), 61 | t) ^ t) + ((Math.imul(t ^ (t >>> 14), 9) >>> 0) * 0x9e3779b9);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic probe budget for a message of `len` characters. */
export function metataxisBudget(len: number): number {
  const env = typeof process !== 'undefined' ? process.env?.OMEGA_METATAXIS_ITERS : undefined;
  if (env !== undefined && Number.isFinite(Number(env))) return Math.max(1, Number(env));
  const n = Math.floor(240_000_000 / Math.max(1000, len));
  return Math.max(MIN_PROBES, Math.min(MAX_PROBES, n));
}

/**
 * Parse a CHIRON tape.  A glyph is a KEY on its first appearance in the tape and a
 * REFERENCE thereafter — the rule X96 paid for twice.  A parser that treats every
 * script character as a new key creates one rule per reference and produces
 * garbage.
 */
function parseTape(tape: string): { keys: string[]; values: string[] } {
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) {
      if (ck !== '') { keys.push(ck); values.push(cv); }
      seen.add(ch); ck = ch; cv = '';
    } else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { keys, values };
}

export function metataxisEncode(
  text: string,
  enc: EncodingName,
  incumbent: { message: string; messageTokens: number; decoded: string },
  opts: { seed?: number; iters?: number } = {},
): MetataxisResult {
  const no: MetataxisResult = { applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens, decoded: incumbent.decoded, notes: 'skipped' };
  if (metataxisDisabled()) return no;

  const msg = incumbent.message;
  const w = msg.indexOf(CHIRON_START);
  if (w < 0) return no;
  const tEnd = msg.indexOf(CHIRON_SEP, w);
  if (tEnd < 0) return no;
  const contract = msg.slice(0, w);
  const tape = msg.slice(w + CHIRON_START.length, tEnd);
  const body = msg.slice(tEnd + CHIRON_SEP.length);

  const { keys, values } = parseTape(tape);
  const n = keys.length;
  // Too few rules for the order to matter, and no DAG to respect.
  if (n < 4) return no;

  const keyIdx = new Map<string, number>();
  keys.forEach((k, i) => keyIdx.set(k, i));
  // dep[i] = rules that rule i's value references; rdep[i] = rules referencing i.
  const dep: number[][] = Array.from({ length: n }, () => []);
  const rdep: number[][] = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    let prev = -1;
    for (const ch of values[i]) {
      const j = keyIdx.get(ch);
      if (j !== undefined && j !== i && j !== prev) { dep[i].push(j); rdep[j].push(i); prev = j; }
    }
  }

  const rnd = mulberry32(opts.seed ?? 0x17a7a);
  let order: number[] = keys.map((_, i) => i);
  const posOf = new Int32Array(n);          // rule -> index in `order`
  const refreshPos = (): void => { for (let k = 0; k < n; k++) posOf[order[k]] = k; };
  refreshPos();

  /** Serialise the tape in `order`.  Letters are UNCHANGED, so no substitution pass is needed. */
  const serialise = (o: number[]): string => {
    let t = '';
    for (const i of o) t += keys[i] + values[i];
    return t;
  };
  const price = (o: number[]): number => countTokens(contract + CHIRON_START + serialise(o) + CHIRON_SEP + body, enc);

  const budget = opts.iters ?? metataxisBudget(msg.length);
  let cur = price(order);
  const start = cur;
  let probes = 0, relocations = 0, since = 0;
  const cand: number[] = [];
  for (let a = 0; a < n; a++) for (let p = 0; p < n; p++) { if (p !== a && p !== a + 1) cand.push(a * n + p); }

  outer:
  for (let step = 0; step < 64; step++) {
    if (probes >= budget) break;
    // Fisher-Yates on the candidate stream, so the walk is seeded but unbiased.
    for (let i = cand.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = cand[i]; cand[i] = cand[j]; cand[j] = t;
    }
    let improved = false;
    for (let ci = 0; ci < cand.length; ci++) {
      if (probes >= budget) break outer;
      const a = (cand[ci] / n) | 0;
      const np = cand[ci] % n;
      const i = order[a];
      // Legality: after removing i and re-inserting at np, every rule i depends on
      // must sit before np and every rule depending on i must sit at or after np.
      let ok = true;
      for (const d of dep[i]) { const k = posOf[d]; if ((k > a ? k - 1 : k) >= np) { ok = false; break; } }
      if (ok) for (const u of rdep[i]) { const k = posOf[u]; if ((k > a ? k - 1 : k) < np) { ok = false; break; } }
      if (!ok) { since++; continue; }
      const rest = order.slice(0, a).concat(order.slice(a + 1));
      const next = rest.slice(0, np).concat([i], rest.slice(np));
      probes++;
      const t2 = price(next);
      if (t2 < cur) {
        order = next; refreshPos(); cur = t2; relocations++; since = 0; improved = true;
        break;
      }
      since++;
      if (since > budget) break outer;
    }
    if (!improved) break;   // a full sweep with no improving move: converged
  }

  if (relocations === 0 || cur >= incumbent.messageTokens) {
    return { applied: false, message: incumbent.message, messageTokens: incumbent.messageTokens, decoded: incumbent.decoded,
      notes: `metataxis: ${probes} probes, ${relocations} relocations, no gain (${start} -> ${cur})` };
  }
  const out = contract + CHIRON_START + serialise(order) + CHIRON_SEP + body;
  // Verify with the repository's own decoder before emitting anything.  NOTE:
  // `chironDecode` wants the WIRE, i.e. the string from `§` onward -- the contract
  // precedes the marker, so passing the whole message makes it return the message
  // unchanged and every candidate would be rejected.  X96 paid for this once.
  let decoded: string;
  try { decoded = chironDecode(out.slice(out.indexOf(CHIRON_START))); } catch { return no; }
  if (decoded !== text) return no;
  return { applied: true, message: out, messageTokens: cur, decoded,
    notes: `metataxis: ${probes} probes, ${relocations} relocations, ${start} -> ${cur} (${cur - start})` };
}
