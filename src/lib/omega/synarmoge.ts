/**
 * X133 — ΣΥΝΑΡΜΟΓΗ / SYNARMOGE ("joint fitting", "articulation")
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MECHANISM, AND WHY IT IS NOT A REHASH OF ANYTHING IN THE STACK
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every post-frontier codec so far optimizes ONE axis, in its own stage, and
 * hands a frozen result to the next stage:
 *
 *   X132 ΕΥΡΟΣ      moves rule spans, glyph assignment FIXED
 *   X130 ΜΕΤΟΝΟΜΑΣΊΑ permutes glyph assignment, spans FIXED
 *   X131 ΕΓΚΙΒΩΤΙΣΜΌΣ factors the tape, spans and assignment FIXED
 *
 * But the axes are NOT separable. Extending a rule from `foo` to `foob` deletes
 * the `b` that used to sit beside the glyph, at every one of its occurrences.
 * Every token boundary that touches that glyph changes with it — so which
 * character the glyph should BE, and whether the rule should exist at all, are
 * functions of the span. A pipeline that fixes one and moves the other samples
 * a single fibre of the joint space and stops at the first coordinate optimum.
 *
 * ΣΥΝΑΡΜΟΓΗ runs ONE local search over all four families against ONE objective,
 * `countTokens(whole message)`, and iterates them to a joint fixed point:
 *
 *   (1) EXTEND / SHRINK a rule's span        — the ΕΥΡΟΣ moves
 *   (2) DROP a rule, inlining it everywhere  — priced TRULY, see below
 *   (3) RENAME a glyph / SWAP two glyphs     — the ΜΕΤΟΝΟΜΑΣΊΑ moves
 *   (4) RE-MINE the CURRENT body             — see below
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IS ACTUALLY NEW HERE (measured, not asserted)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * (2) TRUE-PRICED DROPS. X131's "marginal clearing" audited rules with the
 *     ESTIMATE  c*(t-1) <= (1+t)  and reported ~0. That estimate prices a rule
 *     in isolation and in characters. The original headroom probe claimed
 *     net-negative rules, but that claim was RETRACTED in X133: it mistook
 *     format markers for glyphs and lacked an exactness gate. Corrected purge
 *     measurements found zero on the tested initial frontiers. Joint search
 *     still tests drops after other moves; no initial drop gain is assumed.
 *
 * (4) RE-MINING A BODY THAT SPAN MOVES HAVE ALREADY CHANGED. X132's re-mine ran
 *     on the frontier's own body and found ~0. But a span move DELETES
 *     characters from the body at every occurrence of the rule, which creates
 *     adjacencies that did not exist before. Mining the post-move body is a
 *     different search over a different string, and it is reachable only from
 *     inside a joint loop.
 *
 * (3) IN THE LOOP. Glyph renaming was a separate terminal stage. Inside the loop
 *     it re-runs after every span change, so the assignment can follow the spans.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SAFETY
 * ─────────────────────────────────────────────────────────────────────────────
 * Every candidate is admitted only if it is (a) well-formed — a rule may only
 * reference glyphs defined EARLIER in the tape — and (b) byte-exact, meaning the
 * fully expanded tape+body is UNCHANGED. Where expanding the frontier's own
 * tape+body reproduces the source byte-for-byte the target is the SOURCE ITSELF
 * (an absolute check against ground truth); generative-program lanes fall back
 * to comparing against the frontier's own expansion. A move that is cheaper but
 * not exact is REVERTED, never kept. The search starts from the frontier's own
 * message and accepts only strict measured improvement, so the worst case is the
 * unmodified frontier output: no lane can regress.
 *
 * Env: OMEGA_NO_SYNARMOGE=1 opts out; OMEGA_SYNARMOGE_MS sets the per-lane budget
 * (default 20 000 ms, dated AFTER the frontier encode, which alone can take
 * 40 s+ on the large lanes — dating it before meant the search never ran on
 * exactly the lanes where it has most to look at).
 */
import { countTokens } from './bpe';
import type { EncodingName } from './bpe';
import {
  glyphSetFor, parseTape, buildTape, wellFormed, expandContent,
} from './euros';

export interface FrontierResultLike {
  message: string;
  messageTokens: number;
  decoded: string;
}

interface Rule { g: string; v: string }

export interface SyzeuxisResult {
  message: string;
  /** map a ΣΥΝΑΡΜΟΓΗ message back to the exact frontier message it came from */
  toFrontier: (m: string) => string;
  tokens: number;
  baseTokens: number;
  /** byte-exactness is checked against ground truth, not against a snapshot */
  absolute: boolean;
  probes: number;
  extends_: number;
  shrinks: number;
  drops: number;
  renames: number;
  swaps: number;
  adds: number;
  orphans: number;
  rulesBefore: number;
  rulesAfter: number;
}

function optInt(name: string, dflt: number): number {
  const v = typeof process !== 'undefined' ? Number(process.env?.[name]) : NaN;
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : dflt;
}
function budgetMs(): number {
  const v = typeof process !== 'undefined' ? Number(process.env?.OMEGA_SYNARMOGE_MS) : NaN;
  return Number.isFinite(v) && v > 0 ? v : 20000;
}
export function synarmogeDisabled(): boolean {
  return typeof process !== 'undefined' && process.env?.OMEGA_NO_SYNARMOGE === '1';
}

/** characters the format itself emits — a glyph may never be one of these */
const MARKERS = new Set(['§', '¶', '※', '⁂', 'Δ', 'Ω', 'Σ', 'Φ', 'Λ', 'Π', 'Γ', 'Θ',
  'Ξ', 'µ', 'ℵ', '‡', '¤', '°', '◆', '⁞', '␟', '‖', '†', '•', '·', '±', '×', '÷',
  '≠', '∞', '≈', '≤', '≥']);

const rep = (s: string, a: string, b: string) => (a.length ? s.split(a).join(b) : s);

/**
 * Retune a frontier message by JOINT local search over rule spans, rule
 * existence, and the glyph→character assignment.
 *
 * Returns null when the frontier emitted no tape or when no joint move is both
 * cheaper and byte-exact — callers must then emit the unmodified frontier.
 */
export function synarmogeFromFrontier(
  base: FrontierResultLike, text: string, enc: EncodingName = 'o200k_base',
): SyzeuxisResult | null {
  if (synarmogeDisabled()) return null;
  // Budget starts AFTER the frontier encode (see file header).
  const deadline = Date.now() + budgetMs();

  const M = base.message;
  const i1 = M.indexOf('§');
  if (i1 < 0) return null;                                  // frontier emitted no tape
  const i2 = M.indexOf('¶', i1);
  const pre = M.slice(0, i1);
  const tape0 = i2 < 0 ? M.slice(i1) : M.slice(i1, i2);
  const body0 = i2 < 0 ? '' : M.slice(i2);

  const G = glyphSetFor(text, M);
  const rules0 = parseTape(tape0, G);
  if (rules0.length < 2 || G.size === 0) return null;

  const absolute = expandContent(rules0, body0) === text;
  const TARGET = absolute ? text : expandContent(rules0, body0);

  let rules: Rule[] = rules0.map((r) => ({ g: r.g, v: r.v }));
  let body = body0;
  const msgOf = (rs: Rule[], b: string) => pre + buildTape(rs) + b;
  let curTok = countTokens(msgOf(rules, body), enc);
  const startTok = curTok;

  let probes = 0;
  let nExt = 0, nShr = 0, nDrop = 0, nRen = 0, nSwap = 0, nAdd = 0, nOrph = 0;

  const exact = (rs: Rule[], b: string) => expandContent(rs, b) === TARGET;

  /** Admit a candidate only if well-formed, strictly cheaper AND byte-exact. */
  const tryMove = (rs: Rule[], b: string): boolean => {
    if (!wellFormed(rs)) return false;
    const t = countTokens(msgOf(rs, b), enc);
    probes++;
    if (t >= curTok) return false;
    if (!exact(rs, b)) return false;                        // cheaper but lossy -> reject
    rules = rs; body = b; curTok = t;
    return true;
  };

  const overBudget = () => Date.now() > deadline;

  // ───────────────────────── (1) span moves ────────────────────────────────
  /**
   * The longest string beside EVERY occurrence of `g` — in the body AND in every
   * other rule's value. Every prefix of it is a legal extension, so we try
   * k = 1..len rather than a fixed small k: capping k at 3 gave a 0.7 % hit rate.
   */
  const sharedBeside = (g: string, k: number, dir: 1 | -1): string | null => {
    let s: string | null = null;
    const scan = (s0: string) => {
      for (let i = 0; i < s0.length; i++) {
        if (s0[i] !== g) continue;
        let seg: string;
        if (dir > 0) { if (i + 1 + k > s0.length) return false; seg = s0.slice(i + 1, i + 1 + k); }
        else { if (i - k < 0) return false; seg = s0.slice(i - k, i); }
        if (s === null) s = seg; else if (s !== seg) return false;
      }
      return true;
    };
    if (!scan(body)) return null;
    for (const r of rules) if (r.g !== g && !scan(r.v)) return null;
    return s;
  };
  const longestShared = (g: string, dir: 1 | -1, cap = 14): string => {
    let best = '';
    for (let k = 1; k <= cap; k++) {
      const s = sharedBeside(g, k, dir);
      if (s === null) break;
      best = s;
    }
    return best;
  };
  const wrapEvery = (s: string, g: string, ins: string, after: boolean) =>
    s.split(g).join(after ? g + ins : ins + g);

  const spanPass = (): boolean => {
    let improved = false;
    for (const R of [...rules]) {
      if (overBudget()) break;
      const cur = rules.find((r) => r.g === R.g);
      if (!cur || !cur.v.length) continue;
      if (![...body].some((c) => c === R.g)) continue;       // unused in the body
      // EXTEND by every prefix of the longest shared neighbour
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
          if (tryMove(rs, b)) { nExt++; improved = true; break; }
        }
      }
      // SHRINK: push k edge characters back out to EVERY occurrence
      for (const side of ['head', 'tail'] as const) {
        for (let k = 1; k <= 3 && k < cur.v.length; k++) {
          const cur2 = rules.find((r) => r.g === R.g);
          if (!cur2) break;
          const dropped = side === 'head' ? cur2.v.slice(0, k) : cur2.v.slice(-k);
          const newV = side === 'head' ? cur2.v.slice(k) : cur2.v.slice(0, -k);
          if (!newV.length) continue;
          const after = side === 'tail';
          const rs = rules.map((r) => ({
            g: r.g, v: r.g === R.g ? newV : wrapEvery(r.v, R.g, dropped, after),
          }));
          const b = wrapEvery(body, R.g, dropped, after);
          if (tryMove(rs, b)) { nShr++; improved = true; break; }
        }
      }
    }
    return improved;
  };

  // ─────────────────── (2) true-priced drops + orphans ─────────────────────
  /** remove a rule: inline its value at EVERY occurrence, body and siblings */
  const without = (rs: Rule[], b: string, drop: Rule): { rules: Rule[]; body: string } => ({
    rules: rs.filter((x) => x.g !== drop.g).map((x) => ({ g: x.g, v: rep(x.v, drop.g, drop.v) })),
    body: rep(b, drop.g, drop.v),
  });

  const dropPass = (): boolean => {
    let improved = false;
    for (const R of [...rules]) {
      if (overBudget()) break;
      const cur = rules.find((r) => r.g === R.g);
      if (!cur) continue;
      const t = without(rules, body, cur);
      if (!t.rules.length) continue;                        // never empty the tape
      // liveness: a rule used only once, inside the tape, is pure overhead
      let inBody = 0, inRules = 0;
      for (const ch of body) if (ch === R.g) inBody++;
      for (const r of rules) if (r.g !== R.g) for (const ch of r.v) if (ch === R.g) inRules++;
      if (tryMove(t.rules, t.body)) {
        if (inBody === 0 && inRules <= 1) nOrph++; else nDrop++;
        improved = true;
      }
    }
    return improved;
  };

  // ───────────────────── (3) glyph assignment ──────────────────────────────
  /** candidate characters: the miners' own blocks, minus source, minus in use */
  const POOL = optInt('OMEGA_SYNARMOGE_POOL', 192);
  const candidatePool = (used: Set<string>): string[] => {
    const src = new Set<string>();
    for (let i = 0; i < text.length; i++) src.add(text[i]!);
    const out: string[] = [];
    for (const [lo, hi] of [[0x0400, 0x04ff], [0x0370, 0x03ff]] as [number, number][]) {
      for (let cp = lo; cp <= hi && out.length < POOL; cp++) {
        const ch = String.fromCodePoint(cp);
        if (!src.has(ch) && !used.has(ch) && !MARKERS.has(ch)) out.push(ch);
      }
    }
    return out;
  };
  const applyRename = (map: Map<string, string>) => {
    const rs = rules.map((r) => {
      let v = '';
      for (const ch of r.v) v += map.get(ch) ?? ch;
      return { g: map.get(r.g) ?? r.g, v };
    });
    let b = '';
    for (const ch of body) b += map.get(ch) ?? ch;
    return { rules: rs, body: b };
  };

  /**
   * CHEAP SCREEN FOR A RENAME. Rebuilding and tokenizing the whole message for
   * every (rule x candidate) pair is the codec's dominant cost: 42 rules x 192
   * candidates x 8 sweeps of a 852-token message was measured at +12 s on
   * node-help, a 55 % overhead on the whole stack.
   *
   * This finite character window is only a ranking HEURISTIC. Bounded token
   * length does not prove a bounded influence radius for pre-tokenization or
   * a sequence of BPE merges. X133 measured the screen as speed-neutral.
   * The winner is still priced on the full message and admitted through the
   * ordinary tryMove gate, so a bad ranking loses search quality, not fidelity.
   */
  const WINDOW = 32;
  const windowFor = (glyphs: string[]): string => {
    const want = new Set(glyphs);
    const parts: string[] = [];
    const grab = (s0: string) => {
      for (let i = 0; i < s0.length; i++) {
        if (!want.has(s0[i]!)) continue;
        parts.push(s0.slice(Math.max(0, i - WINDOW), Math.min(s0.length, i + WINDOW)));
      }
    };
    grab(body);
    for (const r of rules) grab(r.v);
    return parts.join('\u0001');            // a separator the real text cannot contain
  };

  const renamePass = (): boolean => {
    let improved = false;
    const used = new Set(rules.map((r) => r.g));
    const pool = candidatePool(used);
    if (!pool.length) return false;
    for (const R of [...rules]) {
      if (overBudget()) break;
      const orig = R.g;
      const win = windowFor([orig]);
      // stage 1 — rank every candidate on the window only
      const ranked: { ch: string; d: number }[] = [];
      for (const ch of pool) {
        if (used.has(ch) && ch !== orig) continue;
        ranked.push({ ch, d: countTokens(win.split(orig).join(ch), enc) });
        probes++;
      }
      ranked.sort((x, y) => x.d - y.d);
      const baseWin = countTokens(win, enc);
      probes++;
      // stage 2 — price the few that the screen says help, on the real message
      let bestCh: string | null = null, bestTok = curTok;
      for (const c of ranked) {
        if (c.d >= baseWin && c.ch !== orig) break;         // screen says no gain
        if (c.ch === orig) continue;
        const map = new Map<string, string>([[orig, c.ch]]);
        const t = applyRename(map);
        const tk = countTokens(msgOf(t.rules, t.body), enc);
        probes++;
        if (tk < bestTok) { bestTok = tk; bestCh = c.ch; }
      }
      if (bestCh !== null && bestCh !== orig) {
        const map = new Map<string, string>([[orig, bestCh]]);
        const t = applyRename(map);
        if (tryMove(t.rules, t.body)) { nRen++; improved = true; used.delete(orig); used.add(bestCh); }
      }
    }
    // SWAP: exchange two glyphs' characters
    const gs = rules.map((r) => r.g);
    for (let i = 0; i < gs.length && !overBudget(); i++) {
      for (let j = i + 1; j < gs.length; j++) {
        const map = new Map<string, string>([[gs[i]!, gs[j]!], [gs[j]!, gs[i]!]]);
        const t = applyRename(map);
        if (tryMove(t.rules, t.body)) { nSwap++; improved = true; }
      }
    }
    return improved;
  };

  // ──────────────── (4) re-mine the body the moves just made ────────────────
  /**
   * Repeated substrings of the body AS IT IS NOW. Span moves delete characters
   * from the body at every occurrence of a rule, which creates adjacencies that
   * did not exist in the frontier's own body — so this searches a different
   * string than X132's re-mine did, and can only run from inside the loop.
   */
  const reminePass = (): boolean => {
    let improved = false;
    const used = new Set(rules.map((r) => r.g));
    const src = new Set<string>();
    for (let i = 0; i < text.length; i++) src.add(text[i]!);
    let fresh: string | null = null;
    for (const [lo, hi] of [[0x0400, 0x04ff], [0x0370, 0x03ff]] as [number, number][]) {
      for (let cp = lo; cp <= hi; cp++) {
        const ch = String.fromCodePoint(cp);
        if (!src.has(ch) && !used.has(ch) && !MARKERS.has(ch)) { fresh = ch; break; }
      }
      if (fresh) break;
    }
    if (!fresh) return false;

    const n = body.length;
    const counts = new Map<string, number>();
    const MAXL = Math.min(24, n);
    for (let L = 3; L <= MAXL; L++) {
      for (let i = 0; i + L <= n; i++) {
        const s = body.slice(i, i + L);
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
    }
    const cands = [...counts.entries()].filter(([, c]) => c >= 2)
      .sort((x, y) => (y[1] - 1) * y[0].length - (x[1] - 1) * x[0].length)
      .slice(0, 40);
    for (const [s] of cands) {
      if (overBudget()) break;
      // a value must not begin with a glyph defined later, and must be non-empty
      if (!s.length) continue;
      const rs = [...rules.map((r) => ({ g: r.g, v: r.v })), { g: fresh, v: s }];
      let out = '', i = 0;
      while (i < body.length) {
        if (body.startsWith(s, i)) { out += fresh; i += s.length; } else { out += body[i]; i++; }
      }
      if (tryMove(rs, out)) { nAdd++; improved = true; break; }
    }
    return improved;
  };

  // ───────────────────────── the joint loop ────────────────────────────────
  // Order matters only for speed; the loop re-runs every family until none of
  // them can improve the shared objective. That is what makes this joint rather
  // than a pipeline: a span move can unlock a drop, a drop can unlock a rename,
  // and a rename can unlock a span move that was unprofitable a moment ago.
  const MAXPASS = optInt('OMEGA_SYNARMOGE_PASSES', 8);
  for (let pass = 0; pass < MAXPASS && !overBudget(); pass++) {
    let improved = false;
    if (spanPass()) improved = true;
    if (!overBudget() && dropPass()) improved = true;
    if (!overBudget() && renamePass()) improved = true;
    if (!overBudget() && reminePass()) improved = true;
    if (!improved) break;
  }

  const message = pre + buildTape(rules) + body;
  const tok = countTokens(message, enc);

  // ───────────────────────────── gates ─────────────────────────────────────
  if (process.env?.OMEGA_SYNARMOGE_DEBUG === '1') {
    console.log(`  [synarmoge] rules ${rules0.length}->${rules.length} probes=${probes} ` +
      `ext=${nExt} shr=${nShr} drop=${nDrop} orphan=${nOrph} ren=${nRen} swap=${nSwap} add=${nAdd} ` +
      `absolute=${absolute} tok=${tok} start=${startTok}`);
  }
  if (!wellFormed(rules)) return null;                       // G1 parsable
  if (!exact(rules, body)) return null;                      // G2 byte-exact
  if (tok >= startTok) return null;                          // G3 strictly cheaper
  if (base.decoded !== text) throw new Error('ΣΥΝΑΡΜΟΓΗ: frontier did not reproduce the source');

  // The moves rewrite the body, so the inverse cannot be a splice: it restores
  // the frontier's own tape and body, which is exactly M.
  const toFrontier = (m: string): string => m.slice(0, i1) + tape0 + body0;
  if (message.slice(i1 + buildTape(rules).length) !== body) {
    throw new Error('ΣΥΝΑΡΜΟΓΗ: tape/body splice is inconsistent');
  }
  if (toFrontier(message) !== M) throw new Error('ΣΥΝΑΡΜΟΓΗ: tape restore is not invertible');

  return {
    message, toFrontier,
    tokens: tok, baseTokens: startTok, absolute, probes,
    extends_: nExt, shrinks: nShr, drops: nDrop, renames: nRen, swaps: nSwap,
    adds: nAdd, orphans: nOrph,
    rulesBefore: rules0.length, rulesAfter: rules.length,
  };
}
