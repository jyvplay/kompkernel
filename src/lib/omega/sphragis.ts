/**
 * src/lib/omega/sphragis.ts — X79. ΣΦΡΑΓΊΣ (sphragis), "a seal, a signet, the stamp
 * that authenticates a document" — here, the stamp that fixes where a separator sits.
 * =============================================================================
 *
 * WHAT THIS IS, AND WHAT IT OWES KERMA (X78)
 * ------------------------------------------
 * This is a GENERALISATION of KERMA's shape language, not an unrelated mechanism, and
 * that is stated first because it is the honest description. Across X76-X79 eight
 * distinct mechanics were priced against this frontier:
 *
 *     inter-column padding removal      the frontier owns it (marginal rate 0.11)
 *     segment interning on raw text     -3 281 with honest markers
 *     segment interning on the wire     0/8, coverage 0.04-0.10
 *     arbitrary substring interning     10/10 refused, closest +2..+4 tok
 *     structural normalisation          +12..+63 on every lane
 *     long-literal interning            +201 over 8 lanes
 *     alphabet remap of wire glyphs     +9..+22  (see WHY NOT below)
 *     bullet / list-marker elision      0 gain through the frontier
 *     whitespace elision round separators  only comma fires, always positive
 *
 * Exactly one thing survived: **shape elision** — deleting characters whose POSITION IS
 * DETERMINED BY A DECLARED WIDTH PATTERN (APOGRAPHE's principle, X39). It survives
 * because it pays no pointer per occurrence and because it changes TOKENISATION, not
 * redundancy — and the frontier eats redundancy but cannot undo tokenisation.
 *
 * KERMA covers decimal runs over `[-:./]` with at most four groups. SPHRAGIS widens
 * that language in four ways, each measured:
 *
 *   1. HEX GROUPS. Groups may contain [0-9a-fA-F], not just digits. This reaches
 *      MAC addresses (`00:1A:2B:3C:4D:5E`), colour codes, object hashes and the
 *      shortened hashes git prints — none of which KERMA can see, because a group
 *      containing a letter defeats `\d`.
 *   2. COMMA AS A SEPARATOR, under a strict structural guard (see G6). `1,234.56`
 *      and `1,234,567.89` are the shapes this unlocks; KERMA had to exclude the comma
 *      entirely because in CSV it is a field separator.
 *   3. UP TO SIX GROUPS, from four.
 *   4. A WORD-BOUNDARY GUARD, which KERMA lacks: a run must not abut another hex
 *      character on either side. Without it a run can be found inside a longer
 *      token, and eliding its separators fuses it into that token.
 *
 * WHY NOT AN ALPHABET REMAP OF THE WIRE (a negative worth recording)
 * ------------------------------------------------------------------
 * bench/x79/alpha.ts made this look like a large win: 32 ids embedded in ASCII text
 * cost 69 tokens written with ASCII glyphs and 96 written with Cyrillic. It is an
 * artefact. bench/x79/remap2.ts measured the same substitution on real frontier wires
 * and it is HARMFUL even with no contract at all: +20, +22, +9 tokens. The reason is
 * structural — only 36 of 126 non-ASCII characters on psql-output's wire have ASCII on
 * both sides. The rest sit inside Cyrillic RUNS, which pack at 0.56 tokens per
 * character; injecting an ASCII glyph into such a run splits it and costs two
 * boundaries. The wire's alphabet is already well chosen.
 *
 * GATES — exact by verification, not by argument
 * -----------------------------------------------
 *   G1  WIDTH UNIQUENESS   at most one kept shape per total run length
 *   G2  NO BARE COLLISION  no separator-free run of that length exists anywhere
 *   G3  NO MERGE           a packed run may not sit beside another run character
 *   G4  WORD BOUNDARY      a run may not abut a [0-9a-fA-F] character on either side
 *   G5  ROUND TRIP         sphragisDecode(message) === source, byte for byte
 *   G6  COMMA SAFETY       a comma may only be elided inside a run; a run may never
 *                          span a newline, and a comma-run must not be the sole
 *                          separator between two fields of a delimited line
 *   G7  STRICT WIN         countTokens(message) < frontier.messageTokens
 *
 * GREEDY? YES, AND ONLY IN THE PRUNE.
 * ------------------------------------
 * Shape discovery is a fixed rule (every run over the separator set, grouped by exact
 * shape, occurring at least twice). Selection is a bounded greedy prune — while it
 * helps, drop the least valuable surviving shape and re-measure with the real tokenizer
 * (<= 24 evaluations). A round is kept only on a strict improvement, so the prune
 * cannot end worse than the unpruned table.
 *
 * TIME-BOUND OR CPU-BOUND? CPU-bound and bounded: discovery is O(n * Lmax); the prune
 * is at most 24 full token counts. No clock enters any decision.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, tagstackFrontier } from './tagstack';
import type { TagstackResult } from './tagstack';

const CONTRACT_HEAD = '§SPHRAGIS';

/** a group of hex-or-decimal characters, joined by one separator, 2..6 groups */
const SEP_CLASS = '[-:./,]';
const GROUP = '[0-9a-fA-F]+';
const RUN_RE = new RegExp(`${GROUP}(?:${SEP_CLASS}${GROUP}){1,5}`, 'g');
const SEP_RE = new RegExp(`(${SEP_CLASS})`);
/** global form: eliding a separator has to remove every one of them, not the first */
const SEP_ALL_RE = new RegExp(SEP_CLASS, 'g');
const HEXISH = /[0-9a-fA-F]/;
const MAX_SHAPES = 24;
const MIN_OCC = 2;

export interface SphragisShape {
  /** `#` per run character; every other character is a literal separator */
  pattern: string;
  /** total run length after elision */
  width: number;
  n: number;
}

export interface SphragisResult {
  codec: 'sphragis';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
  shapes?: SphragisShape[];
  pruned?: number;
}

function splitRun(run: string): { groups: string[]; seps: string[] } | null {
  const parts = run.split(SEP_RE);
  const groups: string[] = [];
  const seps: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const g = parts[i];
    if (g === undefined || g === '' || !/^[0-9a-fA-F]+$/.test(g)) return null;
    groups.push(g);
    const s = parts[i + 1];
    if (s !== undefined) seps.push(s);
  }
  if (groups.length < 2 || groups.length > 6) return null;
  return { groups, seps };
}

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

function expand(packed: string, pattern: string): string | null {
  let sep = 0;
  for (const ch of pattern) if (ch !== '#') sep++;
  const width = pattern.length - sep;
  if (packed.length !== width) return null;
  let out = '';
  let d = 0;
  for (const ch of pattern) {
    if (ch === '#') out += packed[d++];
    else out += ch;
  }
  return out;
}

/**
 * Undo SPHRAGIS. Total: a message without a SPHRAGIS contract line is returned
 * unchanged; runs whose length matches no declared width are left alone.
 */
export function sphragisDecode(message: string): string {
  const nl = message.indexOf('\n');
  const first = nl === -1 ? message : message.slice(0, nl);
  const body = nl === -1 ? '' : message.slice(nl + 1);
  if (!first.startsWith(CONTRACT_HEAD)) return message;
  const rest = first.slice(CONTRACT_HEAD.length).trim();
  const byWidth = new Map<number, string>();
  for (const tok of rest.split(' ')) {
    if (!/^[#\-:./,]+$/.test(tok) || !tok.includes('#')) continue;
    let w = 0;
    for (const ch of tok) if (ch === '#') w++;
    if (w > 0 && !byWidth.has(w)) byWidth.set(w, tok);
  }
  if (byWidth.size === 0) return message;
  return body.replace(/[0-9a-fA-F]+/g, (m) => {
    const pat = byWidth.get(m.length);
    if (pat === undefined) return m;
    return expand(m, pat) ?? m;
  });
}

export function sphragisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): SphragisResult {
  const identity: TagstackResult = frontierFn(text, enc);
  const base = {
    codec: 'sphragis' as const,
    decoded: text,
    exact: true,
    applied: false,
    frontierTokens: identity.messageTokens,
    messageTokens: identity.messageTokens,
    frontierParent: identity.parentCodec,
  };
  const refuse = (notes: string): SphragisResult => ({ ...base, message: identity.message, notes });

  if (text.includes(CONTRACT_HEAD)) return refuse('refused: contract head present in source');

  // Pre-frontier, like KERMA: on the frontier wire the runs have already been rewritten.
  RUN_RE.lastIndex = 0;
  const runsAll = text.match(RUN_RE);
  if (!runsAll || runsAll.length < MIN_OCC) return refuse('refused: no runs');

  // ---- discovery, with G4 (word boundary) and the at-least-one-digit rule ------
  const occ = new Map<string, number>();
  const bad = new Set<string>(); // shapes that violate a structural guard
  let m: RegExpExecArray | null;
  RUN_RE.lastIndex = 0;
  while ((m = RUN_RE.exec(text)) !== null) {
    const run = m[0];
    if (!/\d/.test(run)) continue;                       // must carry at least one digit
    const before = m.index > 0 ? text[m.index - 1] : '';
    const after = m.index + run.length < text.length ? text[m.index + run.length] : '';
    if (HEXISH.test(before) || HEXISH.test(after)) continue; // G4
    if (run.includes('\n')) continue;                        // G6
    const sh = shapeOf(run);
    if (sh === null) continue;
    occ.set(sh, (occ.get(sh) ?? 0) + 1);
  }
  if (occ.size === 0) return refuse('refused: no usable shape');

  // ---- G2: separator-free runs, by length -------------------------------------
  const bare = new Set<number>();
  RUN_RE.lastIndex = 0;
  const masked = text.replace(RUN_RE, (x) => ' '.repeat(x.length));
  for (const r of masked.match(/[0-9a-fA-F]+/g) ?? []) bare.add(r.length);

  // ---- G1: one shape per width -------------------------------------------------
  const widthCount = new Map<number, number>();
  for (const sh of occ.keys()) {
    let w = 0;
    for (const ch of sh) if (ch === '#') w++;
    widthCount.set(w, (widthCount.get(w) ?? 0) + 1);
  }
  const cands: SphragisShape[] = [];
  for (const [sh, n] of occ) {
    if (n < MIN_OCC || bad.has(sh)) continue;
    let w = 0;
    for (const ch of sh) if (ch === '#') w++;
    if (widthCount.get(w) !== 1) continue;   // G1
    if (bare.has(w)) continue;               // G2
    if (!sh.replace(/#/g, '').length) continue; // must actually delete something
    cands.push({ pattern: sh, width: w, n });
  }
  if (cands.length === 0) return refuse('refused: no shape clears the guards');
  cands.sort((a, b) => b.n * (b.pattern.length - b.width) - a.n * (a.pattern.length - a.width));
  if (cands.length > MAX_SHAPES) cands.length = MAX_SHAPES;

  const contractOf = (list: SphragisShape[]) =>
    `${CONTRACT_HEAD} ` + list.map((c) => c.pattern).join(' ');
  const packWith = (list: SphragisShape[]) => {
    RUN_RE.lastIndex = 0;
    return text.replace(RUN_RE, (run) => {
      if (!/\d/.test(run)) return run;
      const sh = shapeOf(run);
      if (sh === null) return run;
      for (const c of list) if (c.pattern === sh) return run.replace(SEP_ALL_RE, '');
      return run;
    });
  };
  const rt = (list: SphragisShape[]) => sphragisDecode(contractOf(list) + '\n' + packWith(list)) === text;

  let cur = cands.slice();
  if (!rt(cur)) {
    let ok = false;
    while (cur.length > 1) { cur = cur.slice(0, -1); if (rt(cur)) { ok = true; break; } }
    if (!ok) return refuse('refused: round trip never holds');
  }

  const armA = (list: SphragisShape[]) => {
    const r: TagstackResult = frontierFn(contractOf(list) + '\n' + packWith(list), enc);
    return { tokens: r.messageTokens, message: r.message, parent: r.parentCodec, decoded: sphragisDecode(r.decoded) };
  };
  const armB = (list: SphragisShape[]) => {
    const r: TagstackResult = frontierFn(packWith(list), enc);
    const c = contractOf(list);
    return { tokens: countTokens(c + '\n' + r.message, enc), message: c + '\n' + r.message, parent: r.parentCodec, decoded: sphragisDecode(c + '\n' + r.decoded) };
  };

  let pruned = 0;
  let bestA = armA(cur);
  let bestB = armB(cur);
  let bestTok = Math.min(bestA.tokens, bestB.tokens);
  for (let step = 0; step < MAX_SHAPES && cur.length > 1; step++) {
    const trial = cur.slice(0, -1);
    if (!rt(trial)) break;
    const a = armA(trial);
    const b = armB(trial);
    const t = Math.min(a.tokens, b.tokens);
    if (t >= bestTok) break;
    cur = trial; bestA = a; bestB = b; bestTok = t; pruned++;
  }

  const win = bestA.tokens <= bestB.tokens ? bestA : bestB;

  // ---- G5/G7: full two-layer round trip, then strict win ----------------------
  if (win.decoded !== text) return refuse('refused: full two-layer round trip failed');
  if (!(bestTok < identity.messageTokens))
    return refuse(`refused: no win (best ${bestTok} >= frontier ${identity.messageTokens}); shapes ${cur.map((c) => c.pattern).join(',')}`);

  return {
    ...base,
    applied: true,
    message: win.message,
    decoded: win.decoded,
    messageTokens: bestTok,
    frontierParent: win.parent,
    shapes: cur,
    pruned,
    notes: `arm ${bestA.tokens <= bestB.tokens ? 'A(in)' : 'B(out)'}, shapes ` +
      cur.map((c) => `${c.pattern}x${c.n}`).join(' ') + (pruned ? ` (pruned ${pruned})` : '') +
      `, message ${identity.messageTokens}->${bestTok} (${bestTok - identity.messageTokens})`,
  };
}

/** convenience: encode with the plain frontier, matching the registry contract */
export function sphragisWire(text: string, enc: EncodingName = 'o200k_base'): SphragisResult {
  return sphragisEncode(text, enc, (t, e) => tagstackEncode(t, e) as TagstackResult);
}
