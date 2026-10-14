/**
 * src/lib/omega/dendron.ts
 * =============================================================================
 * ΔΕΝΔΡΟΝ — a path or URL list written as a tree of bash brace groups
 * (byte-perfect, exact-lossless, single-chat-readable, contract in band)
 * -----------------------------------------------------------------------------
 * δένδρον — "tree". A list of paths or URLs is a set of strings with shared
 * prefixes. The frontier writes each line in full, and DAEDALUS folds the
 * repeated prefix into one glyph per line. That costs one token per line for
 * the prefix, however deep the tree is.
 *
 * THE MECHANISM (not a dictionary)
 * -----------------------------------------------------------------------------
 * Brace expansion is a notation the reader already knows exactly (bash, zsh,
 * Makefile patterns, git refspecs). `src/{lib/omega/a.ts,lib/omega/b.ts}` names
 * two paths, and the reader expands it by a rule it does not have to be taught
 * in detail: the text before `{` is joined to each comma item, in order, and
 * groups nest. A run of consecutive lines that share a first segment becomes
 * one group, so the shared text is written once per level of the tree, not
 * once per line. A glyph dictionary cannot express this structure: it can name
 * a repeated string, but each line still needs one reference to it.
 *
 * MEASURED (o200k, OMEGA_DET=1, M = tokens(contract + wire) of the one-chat message;
 * receipts: bench/z51/receipts/sweep-dendron.jsonl, redteam-dendron.log, probes.txt)
 * -----------------------------------------------------------------------------
 *   git ls-files, first 400 files         M 1563 → 1461  (−102, −6.5%)  tree arm
 *   markdown paths under bench/ (169)     M 1099 → 1080  (−19,  −1.7%)  tree arm
 *   git ls-files, first 160 lines         M  695 →  682  (−13,  −1.9%)  tree arm
 *   git ls-files, first 80 / 40 / 24      M  359 / 222 / 168: tree arm loses → frontier
 *   find, 233 src/lib/omega files         M  767 →  767  (tree arm not cheaper → frontier)
 *   find, 120 timestamped lines (listing) M 1326 → 1326  (tree arm not cheaper → frontier)
 *   450 unique URLs (12 are URI templates with { })      refused → frontier
 *   prose, JSON, diff, table, ls, npm ls  identical (no eligible tree, or tree larger)
 * Break-even is near 120–160 listing lines: the 35-token rule sentence has to be
 * paid back by the braces saved, and a flat run of short paths saves less than that.
 * A tree is not always cheaper: a dense flat listing already costs one glyph per
 * line in DAEDALUS, and the braces cost what the glyphs cost, so the arm loses.
 * The guard keeps the frontier in every such case.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1   DEN_RULE (the contract, one sentence; it is also the dispatch key)
 *   rest     the DAEDALUS wire of the tree text (its own contract follows it)
 * Or, when the frontier is cheaper, the plain DAEDALUS wire unchanged.
 * A payload that already contains a line equal to DEN_RULE or DEN_ESCAPE is
 * sent with DEN_ESCAPE first, so the reader cannot mistake it for a tree.
 *
 * APPLICABILITY (every one is checked; otherwise the frontier is returned)
 *   · at least 3 lines (a trailing newline is an empty last line, which is fine);
 *   · no line contains `{`, `}` or `,` (those would need escapes; whitespace is literal);
 *   · at least 2 lines contain `/`;
 *   · the tree expands back to the input exactly (expander below, checked).
 *
 * EXACTNESS
 *   The expander is the grammar the encoder writes: a line is a sequence of
 *   literals and groups, a group is `{seq(,seq)*}`, groups with one item are
 *   never written (the encoder writes the item bare). The encoder checks the
 *   expansion, then the full composed decode; any mismatch returns the frontier.
 *   Scope: any line list whose lines are free of { } , (paths, URLs, identifiers).
 *   The tree arm is taken only when it is cheaper, so other lists fall back.
 * =============================================================================
 */

import { now } from './clock';
import { countTokens, type EncodingName } from './bpe';
import { chironDecode } from './chiron';
import { daedalusEncode, type DaedalusOptions } from './daedalus';

/** Line 1 of the tree wire. It is the contract and the dispatch key. */
export const DEN_RULE = '∴ paths: bash brace expressions ({a,b} = text before it + a, and + b; groups nest). Expand after other rules; one path per line.';
/** Line 1 when the payload itself contains DEN_RULE or DEN_ESCAPE as a line. */
export const DEN_ESCAPE = '∴ paths: literal payload follows';

/* ---------------------------------------------------------------------------
 * 1. Tree builder (encoder side).
 *    Consecutive lines that share their first segment (up to and including the
 *    first '/') form one group. A group of one item is written bare.
 * ------------------------------------------------------------------------- */
export function denTree(lines: string[]): string[] {
  const rec = (xs: string[]): string[] => {
    const out: string[] = [];
    let i = 0;
    while (i < xs.length) {
      const k = xs[i].indexOf('/');
      if (k < 0) { out.push(xs[i]); i++; continue; }
      const head = xs[i].slice(0, k + 1);
      let j = i + 1;
      while (j < xs.length && xs[j].startsWith(head)) j++;
      if (j - i < 2) { out.push(xs[i]); i++; continue; }
      const items = rec(xs.slice(i, j).map(x => x.slice(head.length)));
      out.push(items.length === 1 ? head + items[0] : head + '{' + items.join(',') + '}');
      i = j;
    }
    return out;
  };
  return rec(lines);
}

/* ---------------------------------------------------------------------------
 * 2. Expander (reader side). Left-to-right, order-preserving.
 * ------------------------------------------------------------------------- */
function expandSeq(s: string, st: { p: number }): string[] {
  let acc: string[] = [''];
  while (st.p < s.length && s[st.p] !== ',' && s[st.p] !== '}') {
    if (s[st.p] === '{') {
      st.p++;
      const alts: string[] = [];
      for (;;) {
        alts.push(...expandSeq(s, st));
        if (st.p >= s.length) throw new Error('dendron: unterminated {');
        if (s[st.p] === ',') { st.p++; continue; }
        st.p++; // '}'
        break;
      }
      const next: string[] = [];
      for (const a of acc) for (const b of alts) next.push(a + b);
      acc = next;
    } else {
      const c = s[st.p++];
      acc = acc.map(a => a + c);
    }
  }
  return acc;
}

/** Expand one line. Throws on a malformed expression (a stray `}` or `,` at top level). */
export function denExpandLine(line: string): string[] {
  const st = { p: 0 };
  const out = expandSeq(line, st);
  if (st.p !== line.length) throw new Error('dendron: stray } or , at top level');
  return out;
}

/** Expand a whole tree text. Lines are expanded in order and joined with \n. */
export function denExpand(treeText: string): string {
  return treeText.split('\n').flatMap(denExpandLine).join('\n');
}

/* ---------------------------------------------------------------------------
 * 3. Applicability.
 * ------------------------------------------------------------------------- */
export function denLines(text: string): string[] | null {
  if (!text) return null;
  const lines = text.split('\n');
  if (lines.length < 3) return null;
  /* An empty line expands to the empty string, so a trailing newline (an empty
   * last line) and an interior empty line both round-trip without a flag. */
  /* Whitespace is literal in a brace expression, so it needs no restriction;
   * only the three syntax characters do. */
  for (const l of lines) if (/[{},]/.test(l)) return null;
  if (lines.filter(l => l.includes('/')).length < 2) return null;
  return lines;
}

/* ---------------------------------------------------------------------------
 * 4. Decoder. Dispatch on line 1, then the DAEDALUS decoder, then the expander.
 * ------------------------------------------------------------------------- */
export function denDecode(wire: string): string {
  const nl = wire.indexOf('\n');
  const first = nl < 0 ? wire : wire.slice(0, nl);
  const rest = nl < 0 ? '' : wire.slice(nl + 1);
  if (first === DEN_RULE) return denExpand(chironDecode(rest));
  if (first === DEN_ESCAPE) return chironDecode(rest);
  return chironDecode(wire);
}

/* ---------------------------------------------------------------------------
 * 5. Encoder. Two arms: the frontier (plain DAEDALUS) and the tree arm.
 *    The tree arm is kept only if it is strictly cheaper and round-trips.
 * ------------------------------------------------------------------------- */
export interface DendronResult {
  codec: 'dendron';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  /** true when the tree arm was used */
  applied: boolean;
  /** M of the frontier arm (plain DAEDALUS) */
  frontierM: number;
  /** M of the tree arm, when it was computed */
  treeM: number | null;
  treeLines: number;
  notes: string;
  ms: number;
}

export function denEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): DendronResult {
  const started = now();
  const plain = daedalusEncode(text, enc, options);
  const frontierM = plain.messageTokens;
  const base = (over: Partial<DendronResult>): DendronResult => ({
    codec: 'dendron', wire: plain.wire, decoded: text, exact: true,
    inTokens: plain.inTokens, outTokens: plain.outTokens, messageTokens: frontierM,
    contractTokens: plain.contractTokens, decoderPrompt: plain.decoderPrompt,
    applied: false, frontierM, treeM: null, treeLines: 0, notes: '', ms: now() - started, ...over,
  });

  // The plain arm must dispatch to itself. A payload that carries a dispatch line is escaped.
  const carries = text.split('\n').some(l => l === DEN_RULE || l === DEN_ESCAPE);
  const plainDispatches = !carries && denDecode(plain.wire) === text;
  if (!plainDispatches) {
    const wire = DEN_ESCAPE + '\n' + plain.wire;
    const prompt = DEN_ESCAPE + '\n' + plain.decoderPrompt;
    const M = countTokens(prompt, enc);
    return base({
      wire, decoderPrompt: prompt, messageTokens: M, contractTokens: M - countTokens(wire, enc),
      outTokens: countTokens(wire, enc), exact: denDecode(wire) === text,
      notes: 'escape: payload carries a dispatch line (or the plain arm did not dispatch)',
    });
  }

  const lines = denLines(text);
  if (!lines) return base({ notes: 'not applicable: lines must be non-empty single tokens with at least 2 containing "/"' });
  const tree = denTree(lines);
  const treeText = tree.join('\n');
  if (denExpand(treeText) !== text) return base({ treeLines: tree.length, notes: 'refused: tree does not expand back to the input' });

  const td = daedalusEncode(treeText, enc, options);
  const wire = DEN_RULE + '\n' + td.wire;
  const prompt = DEN_RULE + '\n' + td.decoderPrompt;
  const treeM = countTokens(prompt, enc);
  const exact = denDecode(wire) === text;
  if (!exact) return base({ treeM, treeLines: tree.length, notes: 'refused: tree arm failed the round trip' });
  if (treeM >= frontierM) return base({ treeM, treeLines: tree.length, notes: `frontier wins: tree arm ${treeM} >= ${frontierM}` });

  return {
    codec: 'dendron', wire, decoded: text, exact: true,
    inTokens: plain.inTokens, outTokens: countTokens(wire, enc), messageTokens: treeM,
    contractTokens: treeM - countTokens(wire, enc), decoderPrompt: prompt,
    applied: true, frontierM, treeM, treeLines: tree.length,
    notes: `tree arm: ${lines.length} lines in ${tree.length} top-level items; M ${treeM} vs frontier ${frontierM} (${treeM - frontierM})`,
    ms: now() - started,
  };
}
