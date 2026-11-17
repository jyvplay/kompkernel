/**
 * src/lib/omega/euros.ts
 * =============================================================================
 * X132 — ΕΥΡΟΣ (eúros, "extent / span"): retune the SPAN each dictionary rule
 *        covers, trading tape cost against body cost one character at a time.
 *
 * THE OBSERVATION. A rule is one chosen span of text that covers c occurrences.
 * But adjacent spans with the SAME occurrence count are equally valid coverings
 * of those occurrences, and they do NOT cost the same number of tokens. If every
 * occurrence of rule R is followed by the same character `x`, then `v+x` occurs
 * c times too and is an equally good rule: the tape grows by one character, and
 * the body loses one character at each of the c sites (the `x` is absorbed into
 * the glyph). Dually a rule can be SHRUNK, pushing characters back out into the
 * body. The miners pick spans once, with an ESTIMATED price and hard caps —
 * merismos.ts:84 fixes MIN_OCC=3, MIN_LEN=4, MAX_DICT=30 and (critically)
 * MAX_LEN=24, so no rule already at the cap was ever eligible to grow. This
 * codec re-prices those boundary decisions against the REAL tokenizer, on the
 * final representation, where later arms have already had their turn.
 *
 * WHY THIS IS NOT ΟΡΟΘΕΣΙΑ (X105). ΟΡΟΘΕΣΊΑ permutes the tape's blocks and
 * prices the permutation by pairwise junctions; the blocks themselves are
 * invariant ("Letters are UNCHANGED", orothesia.ts). ΕΥΡΟΣ leaves the order
 * alone and changes what each block COVERS, moving characters across the
 * rule/body boundary. Different search space, different object.
 *
 * WHY THE TAPE AND NOT THE BODY. X129 ΣΥΓΚΌΛΛΗΣΙΣ rewrote the body and was not
 * pareto (+2190): it destroyed the whitespace, alignment and identifier
 * substrings that ΣΤΉΛΗ / ΣΤΟΙΧΗΔΌΝ / ΒΈΛΤΙΣΤΟΣ depend on. Every move here is
 * EXACT by construction — a character moved out of a rule is re-inserted at
 * every occurrence, so the expanded text is unchanged by design, not by hope.
 *
 * THE CORRECTNESS INVARIANT. The tape denotes a map glyph -> text; the body
 * addresses it. What must not change is the EXPANDED BODY: fully substitute
 * every glyph and the resulting string must be byte-identical. If it is, the
 * parent decoder receives exactly the input it received before, so the whole
 * chain decodes to the same source. This is checked, not assumed — and it is
 * what caught the bug in the first implementation (see "the bug" below).
 *
 * THE BUG THIS INVARIANT CAUGHT. The first version rewrote only the body. But a
 * rule can also be referenced inside ANOTHER rule's value. Extending such a rule
 * silently lengthened the referencing rule's expansion, and shrinking it dropped
 * characters from it. It reported +3 on apt-real and +5 on node-help; the
 * expanded-body check showed both were corrupting the text. Both are now
 * rejected. Every occurrence — body AND other rules' values — must share the
 * neighbouring characters before an extension is legal, and a shrink must
 * re-insert its dropped characters at every occurrence.
 *
 * THE ALPHABET IS DERIVED, NOT ASSUMED. X131 assumed glyphs live in
 * 0x0386..0x04ff. That is wrong: dpkg-l's tape names its rules with ARABIC
 * characters (س ش ا ف …), which are outside that range, so X131 was completely
 * blind on that lane (it recorded "body glyph 0" where the body holds 211).
 * Here the alphabet is derived from the instance: a glyph is a character present
 * in the message but ABSENT from the source, which is exactly how the miners
 * choose ids (merismos.ts:84: "only ones ABSENT from the wire are used").
 *
 * OTHER MOVES INCLUDED (both measured at ~0, kept because they are cheap and
 * because they are the completeness condition for the span search):
 *   - liveness pruning: drop rules the body never reaches, or that are used
 *     once inside another rule (a rule used once is a dead loss of ~2 tokens);
 *   - containment factoring: let a rule cite another rule whose value sits
 *     inside its own — textbook grammar-based compression (Re-Pair), applied to
 *     this tape, matched on expanded values at raw character boundaries.
 *
 * SAFETY. The identity is the floor: nothing is emitted unless the REAL
 * whole-message token count strictly beats the frontier's. Plus the expanded-body
 * invariant above. Plus the frontier's own guarantee, asserted here, that it
 * reproduced the source. No lane can regress.
 *
 * GREEDY? Yes — steepest-ascent over a bounded neighbourhood, each move measured
 * and reverted if it is not byte-exact. Not optimal; every accepted step verified.
 * CPU-BOUND: cost is whole-message `countTokens` probes, capped by a budget.
 * Opt out with OMEGA_NO_EUROS=1; budget OMEGA_EUROS_MS (default 20000 ms).
 * ----------------------------------------------------------------------------
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode } from './tagstack';

type Rule = { g: string; v: string };

/** Blocks the miners draw id characters from (merismos.ts:84 plus the later pools). */
export function inPool(cp: number): boolean {
  return (
    (cp >= 0x0400 && cp <= 0x04ff) ||   // Cyrillic
    (cp >= 0x0370 && cp <= 0x03ff) ||   // Greek
    (cp >= 0x0600 && cp <= 0x06ff) ||   // Arabic  (dpkg-l was found using this)
    (cp >= 0x0590 && cp <= 0x05ff) ||   // Hebrew
    cp === 0x2020 || cp === 0x2021 || cp === 0x2022 || cp === 0x00b7 ||
    cp === 0x00b1 || cp === 0x00d7 || cp === 0x00f7 || cp === 0x2260 ||
    cp === 0x221e || cp === 0x2248 || cp === 0x2264 || cp === 0x2265
  );
}

/** Glyphs = characters in the message that the source does not contain. */
export function glyphSetFor(srcText: string, msg: string): Set<string> {
  const src = new Set<string>();
  for (let i = 0; i < srcText.length; i++) src.add(srcText[i]!);
  const g = new Set<string>();
  for (let i = 0; i < msg.length; i++) {
    const ch = msg[i]!;
    if (!src.has(ch) && inPool(ch.codePointAt(0)!)) g.add(ch);
  }
  return g;
}

/** `§g v g v ...` — the FIRST occurrence of a glyph starts its rule. */
export function parseTape(t: string, G: Set<string>): Rule[] {
  const rs: Rule[] = [];
  const seen = new Set<string>();
  let cur: Rule | null = null;
  for (const ch of t) {
    if (G.has(ch) && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; rs.push(cur); }
    else if (cur) cur.v += ch;
  }
  return rs;
}

export const buildTape = (rs: Rule[]): string => '\u00a7' + rs.map((r) => r.g + r.v).join('');

/** Well-formed = every glyph a value references is defined by an EARLIER rule. */
export function wellFormed(rs: Rule[]): boolean {
  const seen = new Set<string>();
  const names = new Set(rs.map((r) => r.g));
  for (const r of rs) {
    for (const ch of r.v) if (names.has(ch) && !seen.has(ch)) return false;
    seen.add(r.g);
  }
  return true;
}

export function expandRules(rs: Rule[]): Map<string, string> {
  const names = new Set(rs.map((r) => r.g));
  const m = new Map<string, string>();
  for (const r of rs) {
    let o = '';
    for (const ch of r.v) o += (names.has(ch) && m.has(ch)) ? m.get(ch)! : ch;
    m.set(r.g, o);
  }
  return m;
}

/** The invariant: substitute every glyph in the body, recursively. */
export function expandBody(rs: Rule[], b: string): string {
  const m = expandRules(rs);
  const names = new Set(rs.map((r) => r.g));
  let o = '';
  for (const ch of b) o += (names.has(ch) && m.has(ch)) ? m.get(ch)! : ch;
  return o;
}

/**
 * The body is stored WITH its leading `¶` marker; that marker is structure, not
 * content, so it is dropped before the expansion is compared to the source.
 */
export function expandContent(rs: Rule[], b: string): string {
  return expandBody(rs, b.startsWith('\u00b6') ? b.slice(1) : b);
}

export interface EurosResult {
  message: string;
  /** Restore the plain frontier message. */
  toFrontier: (m: string) => string;
  rulesBefore: number;
  rulesAfter: number;
  extends_: number;
  shrinks: number;
  orphansDropped: number;
  refsAdded: number;
  probes: number;
  tokens: number;
  baseTokens: number;
  /** true when byte-exactness was verified against the source itself. */
  absolute: boolean;
}

export interface FrontierResultLike {
  message: string;
  messageTokens: number;
  decoded: string;
}

/**
 * Retune the dictionary spans of an ALREADY-ENCODED frontier message.
 *
 * This is the entry point that makes the codec cheap to adopt: the frontier
 * encode dominates the stack's cost, and a caller that already has it (which is
 * every caller — you must have the frontier message to fall back to when this
 * returns null) can hand it in and pay for the search only. `eurosEncode` is the
 * convenience wrapper that does the encode for you.
 *
 * Returns null when the frontier emitted no tape, when no move pays, or when a
 * move is not byte-exact — callers must then emit the unmodified frontier message.
 */
export function eurosFromFrontier(
  base: FrontierResultLike, text: string, enc: EncodingName = 'o200k_base',
): EurosResult | null {
  if (eurosDisabled()) return null;
  // Budget starts AFTER the frontier encode: that call alone can take 30 s+ on
  // the large lanes, and dating the deadline from before it meant the search
  // never ran at all on exactly the lanes where it has most to look at.
  const deadline = Date.now() + eurosBudgetMs();
  const M = base.message;
  const i1 = M.indexOf('\u00a7');
  if (i1 < 0) return null;                                   // frontier emitted no tape
  const i2 = M.indexOf('\u00b6', i1);
  const pre = M.slice(0, i1);
  const tape = i2 < 0 ? M.slice(i1) : M.slice(i1, i2);
  const body0 = i2 < 0 ? '' : M.slice(i2);

  const G = glyphSetFor(text, M);
  const rules0 = parseTape(tape, G);
  if (rules0.length < 2 || G.size === 0) return null;

  // The invariant we must never break. Where expanding the frontier's own
  // tape+body reproduces the source byte-for-byte (measured true on kb-article,
  // json-pkg, node-help, apt-real), the target is the SOURCE ITSELF — an
  // ABSOLUTE check against ground truth rather than a before/after comparison.
  // Lanes whose body is a generative PROGRAM (dpkg-l: 2841 expanded chars vs
  // 4459 of source) have no such expansion, and fall back to the relative one.
  const absolute = expandContent(rules0, body0) === text;
  const TARGET = absolute ? text : expandContent(rules0, body0);

  let rules: Rule[] = rules0.map((r) => ({ g: r.g, v: r.v }));
  let body = body0;
  let curTok = countTokens(pre + buildTape(rules) + body, enc);
  const startTok = curTok;
  let probes = 0;
  let nExt = 0, nShr = 0, nOrph = 0, nRefs = 0;

  const msgOf = (rs: Rule[], b: string) => pre + buildTape(rs) + b;
  const exact = (rs: Rule[], b: string) => expandContent(rs, b) === TARGET;

  /** Try a candidate; adopt only if cheaper AND byte-exact. */
  const dbg = { formed: 0, notFormed: 0, cheaper: 0, notCheaper: 0, inexact: 0, ok: 0,
                sharedCalls: 0, sharedMs: 0, tryMs: 0, skipNoBodyUse: 0, skipEmptyV: 0, cand: 0 };
  const tryMove = (rs: Rule[], b: string, tag: 'ext' | 'shr' | 'other'): boolean => {
    if (!wellFormed(rs)) { dbg.notFormed++; return false; }
    dbg.formed++;
    const _t1 = Date.now();
    const t = countTokens(msgOf(rs, b), enc);
    dbg.tryMs += Date.now() - _t1;
    probes++;
    if (t >= curTok) { dbg.notCheaper++; return false; }
    dbg.cheaper++;
    const prevR = rules, prevB = body;
    rules = rs; body = b;
    if (!exact(rs, b)) { dbg.inexact++; rules = prevR; body = prevB; return false; }   // revert
    curTok = t; dbg.ok++;
    if (tag === 'ext') nExt++; else if (tag === 'shr') nShr++;
    return true;
  };

  /**
   * The LONGEST string that sits beside EVERY occurrence of `g` (in the body and
   * in every other rule's value), up to `cap` characters. Every prefix of it is a
   * legal extension, so callers try k = 1..len rather than a fixed small k: the
   * first version capped k at 3 and had a 0.7 % hit rate (3 of 441 probes on
   * node-help) largely because it never reached the longer shared runs.
   */
  const sharedBeside = (g: string, k: number, dir: 1 | -1): string | null => {
    let s: string | null = null;
    const scan = (s0: string) => {
      for (let i = 0; i < s0.length; i++) {
        if (s0[i] !== g) continue;
        let seg: string;
        if (dir > 0) {
          if (i + 1 + k > s0.length) return false;
          seg = s0.slice(i + 1, i + 1 + k);
        } else {
          if (i - k < 0) return false;
          seg = s0.slice(i - k, i);
        }
        if (s === null) s = seg; else if (s !== seg) return false;
      }
      return true;
    };
    if (!scan(body)) return null;
    for (const r of rules) if (r.g !== g && !scan(r.v)) return null;
    return s;
  };
  /** Longest shared neighbour (every prefix of which is a legal extension). */
  const longestShared = (g: string, dir: 1 | -1, cap = 14): string => {
    let best = '';
    for (let k = 1; k <= cap; k++) {
      const s = sharedBeside(g, k, dir);
      if (s === null) break;
      best = s;
    }
    return best;
  };

  /** Every occurrence of g in a string, with `ins` inserted before/after it. */
  const wrapEvery = (s: string, g: string, ins: string, after: boolean) =>
    s.split(g).join(after ? g + ins : ins + g);

  const overBudget = () => Date.now() > deadline;

  // ---------------------------------------------------------------- main loop
  for (let pass = 0; pass < 4 && !overBudget(); pass++) {
    let improved = false;

    // ---- (1) SPAN BOUNDARY RETUNING --------------------------------------
    for (const R of [...rules]) {
      if (overBudget()) break;
      const cur = rules.find((r) => r.g === R.g);
      if (!cur || !cur.v.length) { dbg.skipEmptyV++; continue; }
      if (![...body].some((c) => c === R.g)) { dbg.skipNoBodyUse++; continue; }      // not used in the body

      // EXTEND right / left by every prefix of the longest shared neighbour
      for (const dir of [1, -1] as const) {
        const maxAdj = longestShared(R.g, dir);
        for (let k = 1; k <= maxAdj.length; k++) {
          const adj = dir > 0 ? maxAdj.slice(0, k) : maxAdj.slice(maxAdj.length - k);
          if (!adj) break;
          const newV = dir > 0 ? cur.v + adj : adj + cur.v;
          const rs = rules.map((r) => ({
            g: r.g,
            v: r.g === R.g ? newV : r.v.split(dir > 0 ? R.g + adj : adj + R.g).join(R.g),
          }));
          const b = body.split(dir > 0 ? R.g + adj : adj + R.g).join(R.g);
          if (tryMove(rs, b, 'ext')) { improved = true; break; }
        }
      }
      // SHRINK: push k edge characters back out to EVERY occurrence
      for (const side of ['head', 'tail'] as const) {
        for (let k = 1; k <= 3 && k < cur.v.length; k++) {
          const dropped = side === 'head' ? cur.v.slice(0, k) : cur.v.slice(-k);
          const newV = side === 'head' ? cur.v.slice(k) : cur.v.slice(0, -k);
          if (!newV.length) continue;
          const after = side === 'tail';
          const rs = rules.map((r) => ({
            g: r.g,
            v: r.g === R.g ? newV : wrapEvery(r.v, R.g, dropped, after),
          }));
          const b = wrapEvery(body, R.g, dropped, after);
          if (tryMove(rs, b, 'shr')) { improved = true; break; }
        }
      }
    }

    // ---- (2) LIVENESS PRUNING --------------------------------------------
    for (const R of [...rules]) {
      if (overBudget()) break;
      let inBody = 0, inRules = 0;
      for (const ch of body) if (ch === R.g) inBody++;
      for (const r of rules) if (r.g !== R.g) for (const ch of r.v) if (ch === R.g) inRules++;
      if (inBody === 0 && inRules <= 1) {
        const rs = rules.filter((r) => r.g !== R.g)
          .map((r) => ({ g: r.g, v: r.v.split(R.g).join(R.v) }));
        if (rs.length === rules.length - 1 && tryMove(rs, body, 'other')) { nOrph++; improved = true; }
      }
    }

    // NOTE: containment factoring (X131's mechanism) was prototyped here too.
    // It is measured at ~0 on these lanes and its candidate generation is
    // O(rules^2 x matches x len), which dominated the codec's runtime
    // (30 s on dpkg-l for no gain). It is deliberately NOT part of this codec;
    // ΕΓΚΙΒΩΤΙΣΜΌΣ remains the module that owns it.

    if (!improved) break;
  }

  const message = pre + buildTape(rules) + body;
  const tok = countTokens(message, enc);

  // ---------------------------------------------------------------- gates ---
  if (process.env?.OMEGA_EUROS_DEBUG === '1') {
    console.log(`  [euros] glyphs=${G.size} rules0=${rules0.length} probes=${probes} ` +
      `formed=${dbg.formed} notFormed=${dbg.notFormed} cheaper=${dbg.cheaper} ` +
      `notCheaper=${dbg.notCheaper} inexact=${dbg.inexact} ok=${dbg.ok} ` +
      `skipEmptyV=${dbg.skipEmptyV} skipNoBodyUse=${dbg.skipNoBodyUse} ` +
      `sharedCalls=${dbg.sharedCalls} sharedMs=${dbg.sharedMs} tryMs=${dbg.tryMs} ` +
      `absolute=${absolute} bodyLen=${body.length} tok=${tok} start=${startTok}`);
  }
  if (!wellFormed(rules)) return null;                       // G1 parsable
  if (!exact(rules, body)) return null;                      // G2 byte-exact
  if (tok >= startTok) return null;                          // G3 strictly cheaper
  if (base.decoded !== text) throw new Error('ΕΥΡΟΣ: frontier did not reproduce the source');

  // The body is rewritten by these moves, so the inverse cannot be a splice: it
  // restores the frontier's own tape and body, which is exactly M.
  const toFrontier = (m: string): string => m.slice(0, i1) + tape + body0;
  // ...and the splice arithmetic must still be self-consistent, which is what
  // catches an off-by-one in where the new tape ends and the new body begins.
  if (message.slice(i1 + buildTape(rules).length) !== body) {
    throw new Error('ΕΥΡΟΣ: tape/body splice is inconsistent');
  }
  if (toFrontier(message) !== M) throw new Error('ΕΥΡΟΣ: tape restore is not invertible');

  return {
    message, toFrontier,
    rulesBefore: rules0.length, rulesAfter: rules.length,
    extends_: nExt, shrinks: nShr, orphansDropped: nOrph, refsAdded: nRefs,
    probes, tokens: tok, baseTokens: startTok, absolute,
  };
}

function eurosBudgetMs(): number {
  const v = typeof process !== 'undefined' ? Number(process.env?.OMEGA_EUROS_MS) : NaN;
  return Number.isFinite(v) && v > 0 ? v : 20000;
}

/** Opt out with OMEGA_NO_EUROS=1. */
export function eurosDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  return process.env?.OMEGA_NO_EUROS === '1';
}

/**
 * Convenience wrapper: encode with the frontier, then retune the spans.
 * Prefer `eurosFromFrontier` when you already hold the frontier result — it
 * saves a whole frontier encode, which is the dominant cost of the stack.
 */
export function eurosEncode(text: string, enc: EncodingName = 'o200k_base'): EurosResult | null {
  if (eurosDisabled()) return null;
  return eurosFromFrontier(
    tagstackEncode(text, enc) as unknown as FrontierResultLike, text, enc);
}
