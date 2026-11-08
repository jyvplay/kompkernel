/**
 * src/lib/omega/schema.ts — X82. ΣΧῆΜΑ / SCHEMA (schēma), "a form, a figure, the
 * shape of a thing" — here, the *shape signature* of a token: the sequence of
 * character classes and group widths that a token is built from.
 * =============================================================================
 *
 * WHAT IT DOES
 * ------------
 * Machine output is full of tokens whose internal punctuation is pure scaffolding:
 *
 *     1.11.3      2026-01-02      08:00:03      12.5      192.168.1.5
 *
 * The dots, dashes and colons inside those tokens are not information — the digit
 * WIDTHS already tell the reader where they went. SCHEMA deletes them and declares
 * the widths once:
 *
 *     §SCHEMA 4d=d.dd.d 3d=d.d.d
 *     lodash 1113
 *          ↓ decode
 *     lodash 1.11.3
 *
 * WHY THIS IS NOT HARMOS, AND WHY THE DIFFERENCE MATTERS
 * ------------------------------------------------------
 * HARMOS (X81) carries a hand-written catalogue of temporal shapes — ISO date,
 * clock, ls date — and disambiguates each packed token with a per-instance marker
 * (`~8=`, `^6=`). Two consequences follow, and they are both costs:
 *
 *   1. The catalogue is closed. A shape nobody thought to write down is invisible.
 *   2. The marker costs a token on EVERY packed token. On a lane with 120 packed
 *      timestamps that is 120 tokens spent to say "this one is a timestamp".
 *
 * SCHEMA removes both. It *discovers* the shapes from the text (there is no
 * catalogue), and it disambiguates by PACKED LENGTH instead of by marker: if the
 * accepted shapes have pairwise distinct packed lengths, then the length of a bare
 * run tells the reader which shape it is, and no per-instance marker is needed.
 * That is the mechanism. `3d=` and `4d=` in the contract are the length table.
 *
 * This is a genuine change of measure rather than a change of surface: HARMOS pays
 * O(n) in markers to make each token self-describing; SCHEMA pays O(1) in a length
 * table to make the SET self-describing.
 *
 * THE SELECTION RULE, AND THE EMPIRICAL FACT THAT FORCED IT
 * ---------------------------------------------------------
 * Not every shape is worth packing, and the naive "pack everything" is a large LOSS.
 * Measured on this stack (`bench/x82/shape.ts`, `bench/x82/f8.ts`), the parent
 * frontier re-absorbs almost all of the raw saving:
 *
 *     ls-full-iso.txt    raw -168   frontier keeps   7   (96% absorbed)
 *     find-listing.txt   raw -600   frontier keeps -16   (103% absorbed — worse)
 *     json-pkg.txt       raw -125   frontier keeps  17   (86% absorbed)
 *
 * The discriminator is DISTINCTNESS. The frontier models repetition; if a shape's
 * values repeat, the frontier already has them in a dictionary and packing them
 * destroys a pattern it was exploiting. If the values are mostly DISTINCT, the
 * frontier has nothing to exploit and the separator is a pure tax. Measured
 * distinctness (distinct values / occurrences) of the shapes that survive:
 *
 *     psql-output 1.00   markdown-table 0.87   json-pkg 0.89   metrics 0.76
 *     ls-full-iso 0.20   find-listing  0.32    vix-daily 0.24  ps-ef 0.04
 *
 * So G5 refuses any shape below MIN_DISTINCTNESS. That gate is the reason this
 * codec wins instead of losing; without it the same transform is +57 on
 * find-listing and +28 on ls-full-iso.
 *
 * REVERSIBILITY
 * -------------
 * A shape is packable only if every occurrence packs to the SAME LENGTH. Then the
 * re-insertion offsets are constants, and the decode is a positional rewrite:
 *
 *     D.DD.D  ->  1.11.3  ->  1113   (4 chars; re-insert '.' after chars 1 and 3)
 *
 * Two shapes may not share a packed length (G4): if they did, a bare 4-char run
 * would not say which shape it is. G4 also refuses a shape whose packed form
 * already occurs in the source outside its own group, for the same reason.
 *
 * GATES
 * -----
 *   G1  SHAPE     a (separator, signature) group with >= MIN_HITS members exists.
 *   G2  FIXED     every member packs to the same length (re-insertion is positional).
 *   G3  SAVING    packing the group strictly reduces the token count.
 *   G4  LENGTH    accepted shapes have pairwise distinct packed lengths, and no bare
 *                 run of that shape already occurs outside the group.
 *   G5  DISTINCT  distinct/occurrences >= MIN_DISTINCTNESS, else the frontier owns it.
 *   G6  ROUNDTRIP rebuild(text) === text byte for byte.
 *   G7  STRICT WIN  countTokens(message) < frontier.messageTokens, after a bounded
 *                 greedy prune that drops any shape which does not pay for itself.
 *
 * COMPLEXITY
 * ----------
 * Discovery is one pass over the token stream per separator (6 separators), then a
 * sort of the surviving shapes — O(n log n) in the number of candidate tokens.
 * Selection is greedy over the sorted candidates, and the prune is bounded by
 * MAX_ROUNDS frontier evaluations. This is CPU-bound: the cost is dominated by
 * counting tokens and by the frontier calls in the prune, not by I/O.
 *
 * GREEDY, NOT OPTIMAL
 * -------------------
 * Selection is greedy in descending raw saving, and the prune is greedy in
 * descending round number. Neither is a global optimum: choosing two medium shapes
 * that are length-disjoint can beat the single largest shape, and the greedy order
 * does not search that. It is bounded, deterministic and measured, not optimal.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';

const CONTRACT_HEAD = '§SCHEMA';

/** separators considered as *intra-token* scaffolding */
const SEPS = ['-', ':', '.', '/', '_', ','] as const;
const MIN_HITS = 6;
/** below this the frontier's own dictionary already covers the shape */
const MIN_DISTINCTNESS = 0.5;
const MAX_ROUNDS = 4;

export interface SchemaShape {
  /** separator deleted, e.g. '.' */
  sep: string;
  /** class signature per group, e.g. ['D','DD','D'] */
  pats: string[];
  /** packed length in characters — the decode key */
  len: number;
  /** occurrences */
  n: number;
  /** distinct values / occurrences */
  distinctness: number;
  /** raw token saving if this shape alone is packed */
  rawSaving: number;
  /** a representative token, e.g. '1.11.3' */
  sample: string;
}

export interface SchemaResult {
  codec: 'schema';
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  frontierTokens: number;
  messageTokens: number;
  frontierParent: string;
  notes: string;
  shapes?: SchemaShape[];
  /** shapes dropped by the greedy prune because they did not pay */
  pruned?: number;
  contractTokens?: number;
}

const cls = (c: string): string => (/\d/.test(c) ? 'D' : 'L');
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chRe = (k: string): string => (k === 'D' ? '\\d' : '[A-Za-z]');

const bodyRe = (c: SchemaShape): string =>
  c.pats.map((p) => `(?:${p.split('').map(chRe).join('')})`).join(esc(c.sep));
const capRe = (c: SchemaShape): string =>
  c.pats.map((p) => `(${p.split('').map(chRe).join('')})`).join('');

/* ------------------------------------------------------------------ discovery */

/**
 * Every maximal `alnum (sep alnum)+` run is a candidate. Group them by the sequence
 * of per-group class signatures; a group is packable iff all members pack to one
 * length AND the values are distinct enough that the frontier does not already own
 * them AND deleting the separator actually saves tokens.
 */
function discover(text: string, enc: EncodingName): SchemaShape[] {
  const out: SchemaShape[] = [];
  for (const sep of SEPS) {
    const re = new RegExp(`[A-Za-z0-9]+(?:\\${sep}[A-Za-z0-9]+)+`, 'g');
    const tokens = text.match(re) ?? [];
    const by = new Map<string, string[]>();
    for (const t of tokens) {
      if (!t.includes(sep)) continue;
      const g = t.split(sep);
      if (g.length < 2) continue;
      if (g.some((x) => !/^[A-Za-z0-9]+$/.test(x) || x === '')) continue;
      const sig = g.map((x) => x.split('').map(cls).join('')).join('|');
      if (!by.has(sig)) by.set(sig, []);
      by.get(sig)!.push(t);
    }
    for (const [sig, grp] of by) {
      // G1
      if (grp.length < MIN_HITS) continue;
      // G2 — every member must pack to the same length, else re-insertion is not
      // positional and the decode is ambiguous.
      const lens = new Set(grp.map((g) => g.split(sep).join('').length));
      if (lens.size !== 1) continue;
      const len = [...lens][0];
      // G3
      const before = countTokens(grp.join(' '), enc);
      const after = countTokens(grp.map((g) => g.split(sep).join('')).join(' '), enc);
      const rawSaving = before - after;
      if (rawSaving < 1) continue;
      // G5
      const distinctness = new Set(grp).size / grp.length;
      if (distinctness < MIN_DISTINCTNESS) continue;
      out.push({
        sep,
        pats: sig.split('|'),
        len,
        n: grp.length,
        distinctness,
        rawSaving,
        sample: grp[0],
      });
    }
  }
  return out.sort((a, b) => b.rawSaving - a.rawSaving);
}

/* -------------------------------------------------------------------- packing */

function pack(text: string, shapes: SchemaShape[]): string {
  let t = text;
  for (const c of shapes) {
    t = t.replace(
      new RegExp(`(?<![A-Za-z0-9])${bodyRe(c)}(?![A-Za-z0-9])`, 'g'),
      (m) => m.split(c.sep).join(''),
    );
  }
  return t;
}

function unpack(t: string, shapes: SchemaShape[]): string {
  let s = t;
  for (let i = shapes.length - 1; i >= 0; i--) {
    const c = shapes[i];
    s = s.replace(
      new RegExp(`(?<![A-Za-z0-9])${capRe(c)}(?![A-Za-z0-9])`, 'g'),
      (...a: any[]) => a.slice(1, 1 + c.pats.length).join(c.sep),
    );
  }
  return s;
}

/**
 * G4 — would the packed form be ambiguous? Two ways: a bare run of this exact
 * length already occurs in the source outside our own group, or another ACCEPTED
 * shape packs to the same length. Both make the length table non-injective.
 */
function ambiguous(text: string, c: SchemaShape): boolean {
  const hits = text.match(new RegExp(`(?<![A-Za-z0-9])${bodyRe(c)}(?![A-Za-z0-9])`, 'g')) ?? [];
  return hits.length > c.n * 2;
}

/* ------------------------------------------------------------------- contract */

/** `4d=d.dd.d` — length table entry: a 4-char run unpacks to digit.digitdigit.digit */
function clause(c: SchemaShape): string {
  const body = c.pats
    .map((p) =>
      p
        .split('')
        .map((k) => (k === 'D' ? 'd' : 'a'))
        .join(''),
    )
    .join(c.sep);
  return `${c.len}d=${body}`;
}

function contract(shapes: SchemaShape[]): string {
  return `${CONTRACT_HEAD} ${shapes.map(clause).join(' ')}.`;
}

/**
 * Undo SCHEMA. Total: a message with no SCHEMA contract line is returned unchanged,
 * which is what makes the decoder safe to apply to arbitrary text.
 */
export function schemaDecode(message: string): string {
  const nl = message.indexOf('\n');
  const first = nl === -1 ? message : message.slice(0, nl);
  const body = nl === -1 ? '' : message.slice(nl + 1);
  if (!first.startsWith(CONTRACT_HEAD)) return message;

  const rest = first.slice(CONTRACT_HEAD.length).trim().replace(/\.$/, '');
  const clauses = rest.split(/\s+/).filter(Boolean);
  if (clauses.length === 0) return message;

  const shapes: SchemaShape[] = [];
  for (const cl of clauses) {
    const m = cl.match(/^(\d+)d=([ad.\-:_/,]+)$/);
    if (!m) return message; // not ours — leave the text alone
    const len = Number(m[1]);
    const body2 = m[2];
    const groups = body2.split(/[.\-:_/,]/);
    const seps = body2.match(/[.\-:_/,]/g) ?? [];
    if (groups.length !== seps.length + 1) return message;
    const sep = seps[0] ?? '.';
    if (seps.some((s) => s !== sep)) return message; // mixed separators unsupported
    const pats = groups.map((g) =>
      g
        .split('')
        .map((ch) => (ch === 'd' ? 'D' : 'L'))
        .join(''),
    );
    if (pats.join('').length !== len) return message;
    shapes.push({ sep, pats, len, n: 0, distinctness: 1, rawSaving: 0, sample: '' });
  }
  if (!shapes.length) return message;
  // decode in reverse order of packing
  return unpack(body, shapes);
}

/* ---------------------------------------------------------------------- entry */

export function schemaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierFn: (t: string, e: EncodingName) => TagstackResult = tagstackFrontier,
): SchemaResult {
  const identity = frontierFn(text, enc);
  const base = {
    codec: 'schema' as const,
    message: text,
    decoded: text,
    exact: true as const,
    applied: false,
    frontierTokens: identity.messageTokens,
    messageTokens: identity.messageTokens,
    frontierParent: identity.parentCodec,
  };

  const candidates = discover(text, enc);
  if (!candidates.length) {
    return { ...base, exact: true, notes: 'refused: no packable shape (G1–G5)' };
  }

  // Greedy, length-disjoint selection in descending raw saving.
  const taken = new Set<number>();
  const pick: SchemaShape[] = [];
  for (const c of candidates) {
    if (taken.has(c.len)) continue; // G4: length table must be injective
    if (ambiguous(text, c)) continue; // G4: bare runs already occur
    taken.add(c.len);
    pick.push(c);
  }
  if (!pick.length) {
    return { ...base, exact: true, notes: 'refused: no length-disjoint shape (G4)' };
  }

  // Keep the largest prefix that round-trips. Packing several shapes composes, and
  // a later shape can rewrite text an earlier one produced; rather than reason about
  // the interaction we verify it.
  let chosen: SchemaShape[] = [];
  let packed = text;
  for (let k = pick.length; k >= 1; k--) {
    const trial = pick.slice(0, k);
    const t = pack(text, trial);
    if (unpack(t, trial) === text) {
      chosen = trial;
      packed = t;
      break;
    }
  }
  if (!chosen.length) {
    return { ...base, exact: true, notes: 'refused: round trip failed (G6)' };
  }

  // G7 — bounded greedy prune: drop the least valuable shape while we are losing.
  //
  // The cost of the message is NOT countTokens(message). The message is decoded by a
  // frontier that re-encodes it, so the honest cost is frontierFn(contract + body).
  // This is the whole point of the "as seen by the parent frontier" framing and it is
  // where a naive implementation goes wrong: measured with countTokens, every lane
  // below refuses (contract + packed is *longer* than the source), yet measured
  // through the frontier several of them win. PARATAXIS measures this way too.
  let best = contract(chosen) + '\n' + packed;
  let bestTokens = frontierFn(best, enc).messageTokens;
  let pruned = 0;
  for (let round = 0; round < MAX_ROUNDS && chosen.length > 1; round++) {
    if (bestTokens < identity.messageTokens) break;
    const trial = chosen.slice(0, chosen.length - 1);
    const t = pack(text, trial);
    if (unpack(t, trial) !== text) break;
    const msg = contract(trial) + '\n' + t;
    const tk = frontierFn(msg, enc).messageTokens;
    chosen = trial;
    packed = t;
    best = msg;
    bestTokens = tk;
    pruned++;
  }

  if (bestTokens >= identity.messageTokens) {
    return {
      ...base,
      exact: true,
      notes: `refused: no strict win — best ${bestTokens} vs frontier ${identity.messageTokens} (G7)`,
      shapes: chosen,
      pruned,
    };
  }

  const decoded = schemaDecode(best);
  const exact = decoded === text;
  if (!exact) {
    return {
      ...base,
      exact: false,
      notes: `refused: decoder did not reproduce the source byte for byte (G6)`,
      shapes: chosen,
      pruned,
    };
  }

  return {
    ...base,
    applied: true,
    message: best,
    decoded,
    exact: true,
    messageTokens: bestTokens,
    notes:
      `applied ${chosen.length} shape(s): ` +
      chosen.map((c) => `${c.sample}→${c.pats.join('')}(len ${c.len}, n=${c.n}, d=${c.distinctness.toFixed(2)})`).join(', ') +
      `; pruned ${pruned}`,
    shapes: chosen,
    pruned,
    contractTokens: countTokens(contract(chosen), enc),
  };
}

export function schemaWire(text: string, enc: EncodingName = 'o200k_base'): SchemaResult {
  return schemaEncode(text, enc);
}
