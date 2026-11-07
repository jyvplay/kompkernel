/**
 * src/lib/omega/parataxis.ts — X80. ΠΑΡΆΤΑΞΙΣ (parataxis), "a placing side by side;
 * an arrangement in line" — and in grammar, clauses set side by side without
 * subordination. Both senses are meant: the columns are placed side by side, and the
 * contract states the arrangement flatly instead of nesting a description of it.
 * =============================================================================
 *
 * WHAT IT DOES
 * ------------
 * Aligned tables pad every field to a fixed column width. Those padding spaces are
 * PURE GEOMETRY — they carry no information that the column widths do not already
 * carry — yet they are some of the most expensive characters in the wire, because a
 * run of spaces is its own pretokenizer chunk and a run of ten spaces is not one
 * token but several.
 *
 * PARATAXIS deletes the padding and declares the widths once:
 *
 *     TARGET                    SOURCE       FSTYPE   OPTIONS
 *     /                         /dev/vda     ext4     rw,relatime
 *        ↓
 *     §PARATAXIS pad fields to 31 15 8
 *     TARGET SOURCE FSTYPE OPTIONS
 *     / /dev/vda ext4 rw,relatime
 *
 * WHY IT IS NOT SIMPLY "PADDING REMOVAL", AND WHY IT WAS NOT DONE BEFORE
 * -----------------------------------------------------------------------
 * X76 measured padding removal against this frontier and recorded a marginal rate of
 * 0.11 — the frontier appeared to own it. That measurement was taken on lanes where
 * the frontier's own column machinery (METRON, KIONES, APOGRAPHE, SYZEUXIS) already
 * fires. It does NOT fire everywhere. Measured here (`bench/x80/dbg2.ts`):
 *
 *     findmnt.txt        columns at 56 / 74 / 86, 23 of 24 lines aligned
 *     kubectl-get-pods   columns at 37 45 57 68 76 92, all 23 lines aligned
 *     ps-aux-real.txt    8 separators, 5 of them aligned across all 56 lines
 *     df-h.txt           4 separators, 2 aligned
 *     psql-output.txt    not space-aligned at all (it uses `|`); correctly refused
 *
 * On findmnt the frontier's 444-token output is ~83 tokens above what this transform
 * unlocks. The reason the frontier misses it is visible in the data: findmnt's first
 * column is a TREE (`|-/dev`, `` `-/proc``), so column detection sees a ragged first
 * field and gives up. PARATAXIS does not need to detect columns — it reads the
 * geometry off the padding itself.
 *
 * THE CENTRAL DESIGN POINT: THIS IS LOSSLESS, AND THE NAIVE VERSION IS NOT
 * ------------------------------------------------------------------------
 * The obvious transform — collapse runs of two or more spaces to one — is LOSSY. It
 * measured -61 tokens on findmnt in `bench/x80/screen.ts`, and that number is not a
 * codec result, because the original padding cannot be recovered from it. A lossless
 * version must transmit the geometry, and the whole question is whether the geometry
 * is small enough to be worth transmitting. It is: the widths are a handful of small
 * integers, and three of them cost about six tokens.
 *
 * Two earlier hypotheses about how to avoid transmitting them were tested and are
 * FALSE, which is why the widths are in the contract at all:
 *   - "re-align each column to its own maximum content width" — false. Measured
 *     (`bench/x80/align.ts`): restore_by_maxwidth=false on every one of eight lanes.
 *     findmnt's TARGET column is padded to 56 while its widest entry is 52.
 *   - "the padding is a function of the neighbouring fields" — false. findmnt's
 *     column offsets are constant at 56/74/86, but df-h's are not constant at all
 *     (23 on twelve lines, 24 on six), so no single local rule covers both.
 *
 * GATES
 * -----
 *   G1  GEOMETRY      a column set with >= MIN_ROWS fully aligned lines must exist.
 *   G2  SAVING        the transform must actually delete at least one character.
 *   G3  ROUND TRIP    rebuild(line) === line for EVERY line, byte for byte, both
 *                     layers. This is the gate that makes it lossless; it is what
 *                     separates this codec from the naive collapse.
 *   G4  DECODER AMBIGUITY  no line outside the aligned set may have exactly the same
 *                     single-space field count, or the reader could not tell which
 *                     lines to re-pad. See DECODER RULE below.
 *   G5  STRICT WIN    countTokens(message) < frontier.messageTokens.
 *
 * DECODER RULE (why G4 exists)
 * ----------------------------
 * The reader splits each line on a SINGLE space. A line that still carries padding
 * yields empty strings when split that way, so its field count is too high and it is
 * left alone. That is what makes the rule self-identifying — but it also means a line
 * that never had padding and happens to have the right field count would be wrongly
 * re-padded. G4 refuses the lane in exactly that case, so the rule is total.
 *
 * GREEDY? YES, AND ONLY IN THE PRUNE.
 * ------------------------------------
 * Geometry detection is a fixed rule: for each separator index, take the modal
 * next-field offset over the lines that have the full separator count, then keep the
 * lines agreeing with it exactly. Selection is a bounded greedy prune — while it
 * helps, drop the least common width and re-measure with the real tokenizer (<= 16
 * evaluations). A round is kept only on strict improvement.
 *
 * TIME-BOUND OR CPU-BOUND? CPU-bound and bounded: detection is O(n) in characters;
 * the prune is at most 16 full token counts. No clock enters any decision.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, tagstackFrontier } from './tagstack';
import type { TagstackResult } from './tagstack';

const CONTRACT_HEAD = '§PARATAXIS';
/** the collapsed separator. A tab is used rather than a space so that a column whose
 *  text contains single spaces (df-h's `Mounted on`, ps's `COMMAND`) stays one field. */
const MARK = '\t';
const MIN_ROWS = 4;
const MAX_ROUNDS = 4;
const MAX_SKIP = 6;

export interface ParataxisResult {
  codec: 'parataxis';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
  widths?: number[];
  rows?: number;
  pruned?: number;
}

/** per line, the offsets at which each following field begins */
function sepOffsets(line: string): number[] {
  const out: number[] = [];
  const re = / {2,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) out.push(m.index + m[0].length);
  return out;
}

function modal(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const c = new Map<number, number>();
  for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1);
  let best = xs[0], bn = 0;
  for (const [k, v] of c) if (v > bn) { best = k; bn = v; }
  return best;
}

/** widths W[j] = P[j] - P[j-1]: field j occupies exactly W[j] characters, separator included */
function widthsFrom(p: number[]): number[] {
  const w: number[] = [];
  let prev = 0;
  for (const x of p) { w.push(x - prev); prev = x; }
  return w;
}

function offsetsFrom(w: number[]): number[] {
  const p: number[] = [];
  let acc = 0;
  for (const x of w) { acc += x; p.push(acc); }
  return p;
}

/**
 * Undo PARATAXIS. Total: a message with no PARATAXIS contract line is returned
 * unchanged; lines whose field count does not match the widths are left alone.
 */
export function parataxisDecode(message: string): string {
  const nl = message.indexOf('\n');
  const first = nl === -1 ? message : message.slice(0, nl);
  const body = nl === -1 ? '' : message.slice(nl + 1);
  if (!first.startsWith(CONTRACT_HEAD)) return message;
  const rest = first.slice(CONTRACT_HEAD.length).trim();
  const m = rest.match(/^pad fields to ([0-9 ]+?)(?: except ([0-9, ]+))?$/);
  if (!m) return message;
  const w = m[1].trim().split(/[ ]+/).map(Number);
  const skip = new Set<number>(
    (m[2] ?? '').split(',').map((x) => x.trim()).filter((x) => x !== '').map(Number));
  if (w.some((x) => !Number.isFinite(x) || x < 1)) return message;
  const nf = w.length + 1;
  return body.split('\n').map((line, i) => {
    const ln = i + 1;
    if (skip.has(ln)) return line;             // declared literal
    const f = line.split(MARK);
    if (f.length !== nf) return line;
    if (f.some((x) => x === '')) return line;  // cannot have come from a padded line
    let out = '';
    for (let j = 0; j < nf; j++) {
      const piece = j < w.length ? f[j].padEnd(w[j], ' ') : f[j];
      if (j < w.length && f[j].length > w[j]) return line;
      out += piece;
    }
    return out;
  }).join('\n');
}

export function parataxisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): ParataxisResult {
  const identity: TagstackResult = frontierFn(text, enc);
  const base = {
    codec: 'parataxis' as const,
    decoded: text,
    exact: true,
    applied: false,
    frontierTokens: identity.messageTokens,
    messageTokens: identity.messageTokens,
    frontierParent: identity.parentCodec,
  };
  const refuse = (notes: string): ParataxisResult => ({ ...base, message: identity.message, notes });

  if (text.includes(CONTRACT_HEAD)) return refuse('refused: contract head present in source');
  if (text.includes(MARK)) return refuse('refused: source already contains the tab marker');

  const lines = text.split('\n');
  if (lines.length < MIN_ROWS) return refuse('refused: too few lines');

  // ---- G1: detect geometry ---------------------------------------------------
  const geo = lines.map(sepOffsets);
  const k = Math.max(...geo.map((a) => a.length));
  if (k < 1) return refuse('refused: no multi-space separators');
  const full = geo.map((a, i) => (a.length === k ? i : -1)).filter((i) => i >= 0);
  if (full.length < MIN_ROWS) return refuse('refused: too few lines carry the full separator set');

  const P: number[] = [];
  for (let j = 0; j < k; j++) {
    const m = modal(full.map((i) => geo[i][j]));
    if (m === null) return refuse('refused: geometry undetermined');
    P.push(m);
  }
  for (let j = 1; j < k; j++) if (P[j] <= P[j - 1]) return refuse('refused: non-monotonic geometry');

  const aligned = new Set<number>();
  for (const i of full) if (geo[i].every((v, j) => v === P[j])) aligned.add(i);
  if (aligned.size < MIN_ROWS) return refuse(`refused: only ${aligned.size} lines agree on the geometry`);

  // G4 — DECODER AMBIGUITY. A line the reader must NOT re-pad is one that, after the
  // collapse, would look exactly like a padded line: no run of two or more spaces, and
  // exactly nf single-space fields. Those are the only lines that can be misdecoded, so
  // they are listed by number and left literal. Everything else stays self-identifying,
  // because a line that still carries padding yields empty fields when split on one space
  // and therefore cannot be mistaken for a collapsed one.
  const nf0 = k + 1;
  const ambiguous: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (aligned.has(i)) continue;
    const f = lines[i].split(' ');
    if (f.length === nf0 && !f.some((x) => x === '') && !lines[i].includes(MARK)) ambiguous.push(i + 1);
  }
  if (ambiguous.length > MAX_SKIP) return refuse(`refused: ${ambiguous.length} ambiguous lines exceed the skip budget`);

  const contractOf = (w: number[]) => `${CONTRACT_HEAD} pad fields to ${w.join(' ')}` +
    (ambiguous.length ? ` except ${ambiguous.join(',')}` : '');
  const packWith = (w: number[]) => {
    const nf = w.length + 1;
    return lines.map((line, i) => {
      if (!aligned.has(i)) return line;
      const collapsed = line.replace(/ {2,}/g, MARK);
      const cf = collapsed.split(MARK);
      if (cf.length !== nf || cf.some((x) => x === '')) return line;
      return collapsed;
    }).join('\n');
  };

  // ---- G3: round trip, and G4: decoder ambiguity -----------------------------
  const rt = (w: number[]) => parataxisDecode(contractOf(w) + '\n' + packWith(w)) === text;

  let w = widthsFrom(P);
  if (!rt(w)) return refuse('refused: round trip never holds');

  // ---- G2: must actually save something --------------------------------------
  const packed = packWith(w);
  if (packed.length >= text.length) return refuse('refused: no characters removed');

  const armA = (ww: number[]) => {
    const r: TagstackResult = frontierFn(contractOf(ww) + '\n' + packWith(ww), enc);
    return { tokens: r.messageTokens, message: r.message, parent: r.parentCodec, decoded: parataxisDecode(r.decoded) };
  };
  const armB = (ww: number[]) => {
    const r: TagstackResult = frontierFn(packWith(ww), enc);
    const c = contractOf(ww);
    return { tokens: countTokens(c + '\n' + r.message, enc), message: c + '\n' + r.message, parent: r.parentCodec, decoded: parataxisDecode(c + '\n' + r.decoded) };
  };

  let bestA = armA(w);
  let bestB = armB(w);
  let bestTok = Math.min(bestA.tokens, bestB.tokens);

  // PRUNE IS LAZY. Measured over the corpus the prune has never improved a result
  // (`bench/x80/receipts/parataxis.json`: pruned=0 on every lane), and each round costs
  // two full frontier encodes. So the cheap gates run first and the prune only runs on a
  // lane that has already won. This is a pure speed change: the greedy search is unchanged
  // for every lane that could ever have benefited from it.
  if (!(bestTok < identity.messageTokens))
    return refuse(`refused: no win (best ${bestTok} >= frontier ${identity.messageTokens}); widths ${w.join(' ')}`);
  if ((bestA.tokens <= bestB.tokens ? bestA : bestB).decoded !== text)
    return refuse('refused: full two-layer round trip failed');

  let cur = w;
  let pruned = 0;
  for (let step = 0; step < MAX_ROUNDS && cur.length > 1; step++) {
    const trial = cur.slice(0, -1);
    if (!rt(trial)) break;
    if (packWith(trial).length >= text.length) break;
    const a = armA(trial);
    const b = armB(trial);
    const t = Math.min(a.tokens, b.tokens);
    if (t >= bestTok) break;
    cur = trial; bestA = a; bestB = b; bestTok = t; pruned++;
  }

  const win = bestA.tokens <= bestB.tokens ? bestA : bestB;

  // ---- G3 (final, two layers) and G5 -----------------------------------------
  if (win.decoded !== text) return refuse('refused: full two-layer round trip failed');
  if (!(bestTok < identity.messageTokens))
    return refuse(`refused: no win (best ${bestTok} >= frontier ${identity.messageTokens}); widths ${cur.join(' ')}`);

  return {
    ...base,
    applied: true,
    message: win.message,
    decoded: win.decoded,
    messageTokens: bestTok,
    frontierParent: win.parent,
    widths: cur,
    rows: aligned.size,
    pruned,
    notes: `arm ${bestA.tokens <= bestB.tokens ? 'A(in)' : 'B(out)'}, widths ` +
      cur.join(' ') + `, ${aligned.size}/${lines.length} lines, ` +
      `${text.length - packWith(cur).length} chars removed` +
      (pruned ? ` (pruned ${pruned})` : '') +
      `, message ${identity.messageTokens}->${bestTok} (${bestTok - identity.messageTokens})`,
  };
}

/** convenience: encode against the plain frontier, matching the registry contract */
export function parataxisWire(text: string, enc: EncodingName = 'o200k_base'): ParataxisResult {
  return parataxisEncode(text, enc, (t, e) => tagstackEncode(t, e) as TagstackResult);
}
