/**
 * SYNTOMOS (σύντομος — "abridged, cut short").
 *
 * X28. The measured finding behind this codec is that the *fixed* instruction
 * clause is the largest remaining cost that is paid on every single message:
 * on 20 of the 28 holdout lanes the contract is a constant ~20 tokens, which
 * is 12% of a short message and 3% of a long one. Every dictionary-side lever
 * (rule coverage, glyph relabelling, tape factoring) was measured this turn
 * and found exhausted — see docs/codecs.md X28 §D. What is left is the
 * overhead, and the overhead is not a constant: it is a *function of the
 * features the wire actually needs*.
 *
 * So SYNTOMOS stops shipping one fixed contract and instead ships a LADDER:
 * a set of wordings, each tagged with the feature set it covers, from which
 * the cheapest covering wording is selected per message.
 *
 * The features a contract must convey:
 *   MAP    — a letter names (stands for) a phrase
 *   SPLIT  — the ¶ mark separates the glossary from the body
 *   REPEAT — expansion must be iterated to a fixed point
 *   OUTPUT — emit the result only, no commentary
 *   SHAPES — post-expansion string rewrites (variable clause, appended)
 *
 * REPEAT is the interesting one. It is required if and only if some tape rule
 * references another rule (a nested / straight-line-program tape). When the
 * tape is flat, one pass suffices and the clause is dead weight. SYNTOMOS
 * therefore (a) detects nesting exactly, and (b) runs a DE-NESTING ARM that
 * expands nested references away when doing so is cheaper than the clause it
 * retires. De-nesting also makes the decode single-pass, which is strictly
 * easier for a reader that is known to degrade under recursion.
 *
 * Guarantee: SYNTOMOS is a tournament scored on the exact measured objective
 * (token count of the message), and it always keeps the parent arm as a
 * candidate, so it can never be worse than METATHESIS by construction.
 * Decode is byte-identical to SYMPLOKE/METATHESIS — no new syntax at all, so
 * the X26 independent from-spec decoder still applies unchanged.
 *
 * Greedy? The contract choice is an exact minimum over a finite ladder (not
 * greedy, not approximate — the whole ladder is enumerated and the cheapest
 * covering wording wins). The de-nesting decision is a two-arm tournament on
 * a measured objective. The inherited rule search (POLYTROPOS) and the glyph
 * relabelling (METATHESIS) are greedy/hill-climbing, as documented there.
 *
 * Source article: none. The contract ladder, the feature-decomposition of the
 * instruction clause, and the nesting-gated REPEAT are original to this
 * repository. The decision to prefer a single-pass decode is supported by
 * published evidence that transformers degrade under deep in-context
 * recursion — arXiv 2604.20811 (hierarchical degradation on recursive CFGs)
 * and arXiv 2605.00817 (63% at 5 steps to 20% at 95) — but those are
 * motivation, not a source for the construction.
 *
 * Bound: CPU-bound. Everything is a finite enumeration; no wall clock is
 * consulted. (Note that the inherited parents do consult Date.now internally,
 * which the repo's OMEGA_DET flag does NOT stub — see X28 §I.)
 */

import { metathesisEncode, metathesisDecode, MetathesisResult } from './metathesis';
import { symplokeDecode, symplokeContract, SymplokeStats } from './symploke';
import { chironParseTape, chironDecode } from './chiron';
import { scriptOfChar } from './syntomia';
import { countTokens, EncodingName } from './bpe';

export type SyntomosFeature = 'MAP' | 'SPLIT' | 'REPEAT' | 'OUTPUT';

/**
 * A rung is a contract HEAD only. The head is spliced in front of whatever
 * SYMPLOKE emits from the expansion verb onwards, so the shape clause is
 * never re-synthesised. REPEAT is not a property of the head: it is decided
 * by the `nested` argument to symplokeContract, which flips the verb between
 * "expand repeatedly" and "expand".
 *
 * Measured against o200k_base (docs/codecs.md X28 section E). "safe" keeps the
 * delimiting mark named, so the two-section structure is unambiguous;
 * "compact" drops that anchor for another 3 tokens and is NOT enabled by
 * default, because no live model can be run from this sandbox to check that a
 * reader still locates the glossary without it.
 */
export interface ContractRung {
  id: string;
  head: string;
  /** features the head itself supplies; SPLIT is present iff the head names the mark */
  covers: SyntomosFeature[];
}

export const SYNTOMOS_LADDER: ContractRung[] = [
  { id: 'safe', covers: ['MAP', 'SPLIT', 'OUTPUT'],
    head: 'Letters before \u00b6 name the phrases after them. Then ' },
];
export interface SyntomosOptions {
  /** rungs to consider; defaults to SYNTOMOS_LADDER */
  ladder?: ContractRung[];
  /** allow the tape to be de-nested when that retires the REPEAT clause */
  allowDenest?: boolean;
  /** cap on the extra tape tokens de-nesting may cost (default 2) */
  denestSlack?: number;
  /** X33: forwarded to SYMPLOKE (see SymplokeOptions). */
  inCap?: number;
  /** X33: forwarded to SYMPLOKE (see SymplokeOptions). */
  inGate?: number;
}

export interface SyntomosResult extends Omit<MetathesisResult, 'contract'> {
  contract: string;
  /** which ladder rung won */
  rung: string;
  /** was the tape de-nested */
  denested: boolean;
  /** 1 if any rule references another, else 0 */
  nested: number;
  /** message tokens for the arm that was not chosen, for the receipt */
  altMessageTokens: number;
  /**
   * Message tokens of the METATHESIS arm computed on THIS SAME parent wire.
   * Comparing against this rather than against a separate metathesisEncode
   * call is deliberate: the parents consult Date.now internally, so two
   * calls under different load can return different wires. Measuring inside
   * one encode makes the delta immune to that drift.
   */
  metathesisMessageTokens: number;
}

/** Expand every rule body to plain text, resolving references to earlier rules. */
function expandRules(parsed: Array<{ glyph: string; raw: string }>): Map<string, string> {
  const ex = new Map<string, string>();
  for (const p of parsed) {
    let s = p.raw;
    for (let k = 0; k < 12; k++) {
      let n = '';
      for (const c of s) n += ex.get(c) ?? c;
      if (n === s) break;
      s = n;
    }
    ex.set(p.glyph, s);
  }
  return ex;
}

/** Count glyph characters inside rule bodies, i.e. references to other rules. */
function countNestedRefs(parsed: Array<{ glyph: string; raw: string }>): number {
  const defined = new Set(parsed.map((p) => p.glyph));
  let n = 0;
  for (const p of parsed) for (const c of p.raw) if (defined.has(c)) n++;
  return n;
}

function cheapestHead(ladder: ContractRung[]): ContractRung | null {
  let best: ContractRung | null = null;
  for (const rung of ladder) {
    const cost = countTokens(rung.head, 'o200k_base' as EncodingName);
    if (!best || cost < countTokens(best.head, 'o200k_base' as EncodingName)) best = rung;
  }
  return best;
}

export function syntomosEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: SyntomosOptions = {},
): SyntomosResult {
  const T = (s: string) => countTokens(s, enc);
  const ladder = options.ladder ?? SYNTOMOS_LADDER;
  const allowDenest = options.allowDenest ?? true;
  const slack = options.denestSlack ?? 2;
  const rung = cheapestHead(ladder)!;

  // X33: PROPAGATION GAP. This call used to drop `options` on the floor, so
  // `inCap`/`inGate` (and anything else a caller passed to a codec above
  // SYNTOMOS) never reached SYMPLOKE. Forwarded now.
  const r: any = metathesisEncode(text, enc, {
    inCap: options.inCap, inGate: options.inGate,
  });
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));

  // No tape (identity parent): there is no glossary, so no contract at all.
  const sep = r.wire.indexOf('\u00b6');
  if (sep < 0 || !r.rules) {
    return {
      ...r, contract: '', rung: 'none', denested: false, nested: 0,
      altMessageTokens: r.messageTokens, messageTokens: T(r.wire), wireTokens: T(r.wire),
      metathesisMessageTokens: r.messageTokens,
    };
  }

  const tape = r.wire.slice(1, sep);
  const body = r.wire.slice(sep + 1);
  const sc = scriptOfChar(tape[0]);
  const parsed: Array<{ glyph: string; raw: string }> = (sc && chironParseTape(tape, sc)) || [];
  const nested = parsed.length ? countNestedRefs(parsed) : 0;

  // Arm A: the wire exactly as METATHESIS produced it.
  const cA = syntomosContract(rung.head, r.stats, nested > 0);
  const armA = { wire: r.wire, contract: cA, tokens: T(r.wire) + T(cA) };

  // Arm B: flatten the tape. That retires the REPEAT clause and, more
  // importantly, turns a fixed-point expansion into a single pass.
  let armB: { wire: string; contract: string; tokens: number } | null = null;
  if (allowDenest && nested > 0 && parsed.length) {
    const ex = expandRules(parsed);
    let flat = '';
    for (const p of parsed) flat += p.glyph + ex.get(p.glyph)!;
    if (T(flat) - T(tape) <= slack) {
      const wire = '\u00a7' + flat + '\u00b6' + body;
      // Only legal if it still decodes to the source text.
      if (symplokeDecode(wire, { stats: r.stats, order: r.order, undo }) === text) {
        const cB = syntomosContract(rung.head, r.stats, false);
        armB = { wire, contract: cB, tokens: T(wire) + T(cB) };
      }
    }
  }

  let chosen = armA;
  let denested = false;
  if (armB && armB.tokens < armA.tokens) { chosen = armB; denested = true; }
  const alt = denested ? armA.tokens : armB ? armB.tokens : armA.tokens;

  return {
    ...r,
    wire: chosen.wire,
    contract: chosen.contract,
    messageTokens: chosen.tokens,
    wireTokens: T(chosen.wire),
    rung: rung.id,
    denested,
    nested,
    altMessageTokens: alt,
    metathesisMessageTokens: r.messageTokens,
  };
}

/**
 * Rewrite SYMPLOKE's contract head into the shorter SYNTOMOS head, leaving
 * everything from the expansion verb onwards COMPLETELY untouched.
 *
 * This is deliberately a prefix rewrite and not a reconstruction. The shape
 * clause is generated by symplokeContract, which braids each digit rule's
 * width, its sentinel mode and the "drop the marker" fact into one sentence;
 * an earlier draft of this file re-synthesised that clause with a regex and
 * silently DROPPED the whole shape clause on dump.sql, and capitalised a
 * mid-sentence "and" on meeting-transcript. The TypeScript round trip could
 * not see either bug, because symplokeUncollapse reads its shape table from
 * `stats`, not from the contract text — only the from-spec decoder, which is
 * handed nothing but the message, can. So: touch the head, never the tail.
 *
 * If the parent's wording ever changes such that the expected prefix is not
 * present, we return the parent's contract unchanged. Losing 2 tokens is
 * acceptable; shipping a silently undecodable wire is not.
 */
const SYMPLOKE_HEAD_RE = /^Before (.) new foreign letters name text to the next\. After \1 /;

export function syntomosContract(head: string, stats: SymplokeStats, nested: boolean): string {
  const parent = symplokeContract(stats, true, nested);
  if (!parent) return '';
  const m = parent.match(SYMPLOKE_HEAD_RE);
  if (!m) return parent; // fail-safe: unknown shape, keep the parent's wording
  return head + parent.slice(m[0].length);
}

export function syntomosDecode(
  wire: string,
  cfg: { stats: SymplokeStats; order?: 'in' | 'out'; undo: (w: string) => string },
): string {
  return metathesisDecode(wire, cfg);
}

export function syntomosRoundTrip(text: string, enc: EncodingName = 'o200k_base'): boolean {
  const r = syntomosEncode(text, enc);
  const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
  return syntomosDecode(r.wire, { stats: r.stats, order: r.order, undo }) === text;
}
