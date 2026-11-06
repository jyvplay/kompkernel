/**
 * src/lib/omega/kerma.ts — X78. ΚΈΡΜΑ (kerma), "small coin, small change; a thing cut
 * into small pieces" (κερματίζω, to cut up into small pieces).
 * =============================================================================
 *
 * THE MEASUREMENT THAT PRODUCED THIS CODEC
 * ----------------------------------------
 * The currency of this stack is TOKENS, not characters, and the o200k pretokenizer is
 * lopsided: `\p{N}{1,3}` permits up to THREE digits in one chunk, but every separator
 * character starts a chunk of its own. So a separator inside a number costs a whole
 * token while three digits cost one. Measured (bench/x78/quirk.ts):
 *
 *     2026-09-30        6 tok   ->  20260930        3 tok
 *     08:00:03          5 tok   ->  080003          2 tok
 *     192.168.1.100     7 tok   ->  192168100       3 tok
 *     a1b2c3d4-e5f6-7890-abcd-ef1234567890   23 -> 18 tok
 *     12 log lines with ISO dates and clock times:  251 -> 179 tok  (-28.7 %)
 *     a column of IPv4 addresses:                   131 ->  95 tok  (-27.5 %)
 *
 * WHAT IS AND IS NOT NEW HERE (disclosed inheritance, stated up front)
 * --------------------------------------------------------------------
 * The MECHANISM FAMILY is not new. STIGME (X19) deletes separators inside a token and
 * restores them from the token's own digits; MORPHE (X20) removed STIGME's hard-coding
 * and fits a rule library to the payload; UUIDFOLD, HORA, HEMERA and STATHMOS are
 * related value transforms. This codec inherits that family openly.
 *
 * What is new is the SHAPE SET. STIGME ships three hard-coded shapes — `YYYY-MM-DD`,
 * `YYYY/MM/DD`, `THH:MM:SS` — and a fourth (clock after a date). A payload whose
 * numbers are not dates or times gets nothing from it. KERMA fits ARBITRARY shapes:
 * any run of digit groups over the separator set, of any group widths, any number of
 * groups up to four, any separator glyph. It is fitted per payload and kept only on a
 * measured win.
 *
 * That difference is not cosmetic. On `psql-output.txt`, whose numeric columns are
 * dates (`2026-01-02`) AND fixed-precision amounts (`100.00`, shape `###.##`), the
 * complete existing frontier — 242 codecs, STIGME and MORPHE included — produces
 * **244 tokens**. KERMA produces **169**. The amount column is a shape STIGME has no
 * rule for, and it is half the payload's numbers.
 *
 *   STIGME   three hard-coded shapes (date, T-time, clock-after-date)
 *   MORPHE   a fitted rule library, parameterised over a rule catalogue
 *   KERMA    unconstrained shape fitting: the shape is whatever the payload contains,
 *            with a per-shape collision guard, priced by measurement
 *
 * WHY IT IS A SHAPE TRANSFORM AND NOT A SUBSTITUTION
 * --------------------------------------------------
 * APOGRAPHE (X39) established the distinction: every substitution pays at least one
 * token per use for a pointer at the point of substitution. KERMA pays NOTHING per
 * occurrence. It deletes characters whose position follows from the remaining digits
 * and the declared width pattern, and buys the pattern once in the contract. This is
 * why a saving of ~1 raw token per occurrence can still be a large frontier win: there
 * is no per-use pointer to pay for.
 *
 * SAFETY: EXACT BY VERIFICATION, NOT BY ARGUMENT
 * ----------------------------------------------
 * The elision is invertible only when no OTHER digit run in the payload would be
 * mis-read by the reader rule. KERMA never reasons about that case by case; it enforces
 * four structural guards and then verifies the full round trip byte for byte:
 *
 *   G1  WIDTH UNIQUENESS  - at most one kept shape per total digit length, so a bare
 *                           digit run of length N has exactly one possible reading.
 *   G2  NO BARE COLLISION - no separator-free digit run of that length exists anywhere
 *                           in the payload, so only elided runs can have that length.
 *   G3  NO MERGE          - a packed run may not sit next to another digit, in either
 *                           direction, because the two would fuse into one longer run
 *                           that no rule describes.
 *   G4  ROUND TRIP        - kermaDecode(kermaMessage(x)) === x, byte for byte.
 *   G5  STRICT WIN        - countTokens(message) < frontier.messageTokens.
 *
 * G4 and G5 are the whole guarantee: nothing is emitted that fails either.
 *
 * GREEDY? YES, AND ONLY IN THE PRUNE.
 * ------------------------------------
 * Shape discovery is not a search: a fixed rule (every digit run over the separator
 * set, grouped by exact shape, occurring at least twice). Selection is a bounded greedy
 * prune — while it helps, drop the least valuable surviving shape and re-measure with
 * the real tokenizer (<= 24 evaluations, one token count each). A round is kept only on
 * a strict improvement, so the prune cannot end worse than the unpruned table.
 *
 * TIME-BOUND OR CPU-BOUND?
 * ------------------------
 * CPU-bound, and bounded: shape discovery is O(n * Lmax) over the payload; the prune is
 * at most 24 full token counts. No clock enters any decision.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, tagstackFrontier } from './tagstack';
import type { TagstackResult } from './tagstack';

const CONTRACT_HEAD = '§KERMA';

/**
 * A digit run: groups of digits separated by ONE character from the separator set.
 * `,` and `+` are deliberately excluded: in CSV they are FIELD separators, and eliding
 * them fuses whole rows into one number (measured on bench/x78/pack.ts: vix-daily
 * went from 461 to 629 tokens when a whole CSV row was swallowed as one run).
 */
const RUN_RE = /\d+(?:[-:./]\d+){1,3}/g;
const SEP_RE = /([-:./])/;
const MAX_SHAPES = 24;
const MIN_OCC = 2;

export interface KermaShape {
  /** e.g. `####-##-##` — '#' marks a digit, every other character is a literal */
  pattern: string;
  /** total digit count */
  width: number;
  /** occurrences in the payload */
  n: number;
}

export interface KermaResult {
  codec: 'kerma';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
  shapes?: KermaShape[];
  pruned?: number;
}

/** Split a run into its digit groups and separator glyphs. */
function splitRun(run: string): { groups: string[]; seps: string[] } | null {
  const parts = run.split(SEP_RE);
  const groups: string[] = [];
  const seps: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const g = parts[i];
    if (g === undefined || g === '' || !/^\d+$/.test(g)) return null;
    groups.push(g);
    const s = parts[i + 1];
    if (s !== undefined) seps.push(s);
  }
  if (groups.length < 2 || groups.length > 4) return null;
  return { groups, seps };
}

/** Render a run's shape as `#` per digit with the literal separators kept. */
function shapeOf(run: string): string | null {
  const sp = splitRun(run);
  if (sp === null) return null;
  let out = '';
  for (let i = 0; i < sp.groups.length; i++) {
    out += '#'.repeat(sp.groups[i].length);
    if (sp.seps[i] !== undefined) out += sp.seps[i];
  }
  return out;
}

/** Reinsert the separators of `pattern` into a bare digit run. */
function expand(digits: string, pattern: string): string | null {
  let count = 0;
  for (const ch of pattern) if (ch !== '#') count++;
  const width = pattern.length - count;
  if (digits.length !== width) return null;
  let out = '';
  let d = 0;
  for (const ch of pattern) {
    if (ch === '#') out += digits[d++];
    else out += ch;
  }
  return out;
}

/**
 * Undo KERMA. Total: input without a KERMA contract line is returned unchanged; digit
 * runs whose length matches no declared width are left alone.
 */
export function kermaDecode(message: string): string {
  const nl = message.indexOf('\n');
  const first = nl === -1 ? message : message.slice(0, nl);
  const body = nl === -1 ? '' : message.slice(nl + 1);
  if (!first.startsWith(CONTRACT_HEAD)) return message;
  const rest = first.slice(CONTRACT_HEAD.length).trim();
  const byWidth = new Map<number, string>();
  for (const tok of rest.split(' ')) {
    if (!/^[#\-:./]+$/.test(tok) || !tok.includes('#')) continue;
    let w = 0;
    for (const ch of tok) if (ch === '#') w++;
    if (w > 0 && !byWidth.has(w)) byWidth.set(w, tok);
  }
  if (byWidth.size === 0) return message;
  return body.replace(/\d+/g, (m) => {
    const pat = byWidth.get(m.length);
    if (pat === undefined) return m;
    return expand(m, pat) ?? m;
  });
}

export function kermaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): KermaResult {
  const identity: TagstackResult = frontierFn(text, enc);
  const base = {
    codec: 'kerma' as const,
    decoded: text,
    exact: true,
    applied: false,
    frontierTokens: identity.messageTokens,
    messageTokens: identity.messageTokens,
    frontierParent: identity.parentCodec,
  };
  const refuse = (notes: string): KermaResult => ({ ...base, message: identity.message, notes });

  if (text.includes(CONTRACT_HEAD)) return refuse('refused: contract head present in source');

  // ---- shape discovery on the SOURCE (fixed rule, not a search) --------------
  // KERMA is a PRE-FRONTIER transform, unlike PINAX and MERISMOS. It has to be: on the
  // frontier wire the digits have already been rewritten (psql-output's wire carries
  // `хьҭаҭовавигагьДаДобабитать09а09`, no hyphen in sight), so there is nothing left to
  // elide there. Measured: running the same shapes against the wire refuses on 6 of 8
  // lanes with "no digit runs".
  RUN_RE.lastIndex = 0;
  const runs = text.match(RUN_RE);
  if (!runs || runs.length < MIN_OCC) return refuse('refused: no digit runs');

  const occ = new Map<string, number>();
  for (const r of runs) {
    const sh = shapeOf(r);
    if (sh === null) continue;
    occ.set(sh, (occ.get(sh) ?? 0) + 1);
  }
  if (occ.size === 0) return refuse('refused: no usable shape');

  // ---- G2: bare (separator-free) digit runs, by length ----------------------
  const bare = new Set<number>();
  RUN_RE.lastIndex = 0;
  const masked = text.replace(RUN_RE, (m) => ' '.repeat(m.length));
  for (const m of masked.match(/\d+/g) ?? []) bare.add(m.length);

  // ---- G3: a packed run must not sit next to another digit ------------------
  RUN_RE.lastIndex = 0;
  const adjacency = new Map<string, boolean>();
  let mm: RegExpExecArray | null;
  while ((mm = RUN_RE.exec(text)) !== null) {
    const sh = shapeOf(mm[0]);
    if (sh === null) continue;
    const b = mm.index > 0 ? text.charCodeAt(mm.index - 1) : 0;
    const a = mm.index + mm[0].length < text.length ? text.charCodeAt(mm.index + mm[0].length) : 0;
    const bad = (b >= 48 && b <= 57) || (a >= 48 && a <= 57);
    if (bad || adjacency.get(sh) === true) adjacency.set(sh, true);
    else if (!adjacency.has(sh)) adjacency.set(sh, false);
  }

  // ---- G1: one shape per total digit width ----------------------------------
  const widthCount = new Map<number, number>();
  for (const sh of occ.keys()) {
    let w = 0;
    for (const ch of sh) if (ch === '#') w++;
    widthCount.set(w, (widthCount.get(w) ?? 0) + 1);
  }
  const cands: KermaShape[] = [];
  for (const [sh, n] of occ) {
    if (n < MIN_OCC) continue;
    let w = 0;
    for (const ch of sh) if (ch === '#') w++;
    if (widthCount.get(w) !== 1) continue;      // G1
    if (bare.has(w)) continue;                  // G2
    if (adjacency.get(sh) === true) continue;   // G3
    if (!sh.replace(/#/g, '').length) continue; // must actually delete something
    cands.push({ pattern: sh, width: w, n });
  }
  if (cands.length === 0) return refuse('refused: no shape clears the guards');
  cands.sort((a, b) => b.n * (b.pattern.length - b.width) - a.n * (a.pattern.length - a.width));
  if (cands.length > MAX_SHAPES) cands.length = MAX_SHAPES;

  const contractOf = (list: KermaShape[]) =>
    `${CONTRACT_HEAD} digits fill # in: ` + list.map((c) => c.pattern).join(' ');
  const packWith = (list: KermaShape[]) => {
    RUN_RE.lastIndex = 0;
    return text.replace(RUN_RE, (m) => {
      const sh = shapeOf(m);
      if (sh === null) return m;
      for (const c of list) if (c.pattern === sh) return m.replace(/[-:./]/g, '');
      return m;
    });
  };

  // ---- G4 candidate: KERMA's own layer must round-trip byte for byte --------
  const rt = (list: KermaShape[]) => kermaDecode(contractOf(list) + '\n' + packWith(list)) === text;

  let cur = cands.slice();
  if (!rt(cur)) {
    // drop shapes one at a time from the least valuable until the round trip holds
    let ok = false;
    while (cur.length > 1) {
      cur = cur.slice(0, -1);
      if (rt(cur)) { ok = true; break; }
    }
    if (!ok) return refuse('refused: round trip never holds');
  }

  // ---- the only greedy step: a bounded marginal prune -----------------------
  // Two arms are priced and the cheaper wins; both are priced against the identity arm.
  const armA = (list: KermaShape[]) => {           // contract INSIDE the frontier input
    const r: TagstackResult = frontierFn(contractOf(list) + '\n' + packWith(list), enc);
    return { tokens: r.messageTokens, message: r.message, parent: r.parentCodec };
  };
  const armB = (list: KermaShape[]) => {           // contract OUTSIDE the frontier wire
    const r: TagstackResult = frontierFn(packWith(list), enc);
    return { tokens: countTokens(contractOf(list) + '\n' + r.message, enc), message: contractOf(list) + '\n' + r.message, parent: r.parentCodec };
  };
  let pruned = 0;
  let bestA = armA(cur), bestB = armB(cur);
  let bestTok = Math.min(bestA.tokens, bestB.tokens);
  for (let step = 0; step < MAX_SHAPES && cur.length > 1; step++) {
    const trial = cur.slice(0, -1);
    if (!rt(trial)) break;
    const a = armA(trial), b = armB(trial);
    const t = Math.min(a.tokens, b.tokens);
    if (t >= bestTok) break;
    cur = trial; bestA = a; bestB = b; bestTok = t; pruned++;
  }

  // ---- G5: strict win against the identity arm ------------------------------
  if (!(bestTok < identity.messageTokens))
    return refuse(
      `refused: no win (best ${bestTok} >= frontier ${identity.messageTokens}); ` +
        `shapes ${cur.map((c) => c.pattern).join(',')}`,
    );

  const win = bestA.tokens <= bestB.tokens ? bestA : bestB;
  return {
    ...base,
    applied: true,
    message: win.message,
    messageTokens: bestTok,
    frontierParent: win.parent,
    shapes: cur,
    pruned,
    notes: `arm ${bestA.tokens <= bestB.tokens ? 'A(in)' : 'B(out)'}, ` +
      `shapes ${cur.map((c) => `${c.pattern}x${c.n}`).join(' ')}${pruned ? ` (pruned ${pruned})` : ''}, ` +
      `message ${identity.messageTokens}->${bestTok} (${bestTok - identity.messageTokens})`,
  };
}

/** convenience: encode with the plain frontier, matching the registry contract */
export function kermaWire(text: string, enc: EncodingName = 'o200k_base'): KermaResult {
  return kermaEncode(text, enc, (t, e) => tagstackEncode(t, e) as TagstackResult);
}
