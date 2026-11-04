/**
 * src/lib/omega/prosphysis.ts — X74. ΠΡΌΣΦΥΣΙΣ (prosphysis), "a growth onto
 * something, an attachment".
 * =============================================================================
 *
 * THE MEASUREMENT THIS CODEC IS BUILT ON (bench/x74/t24.ts, this repository)
 * -----------------------------------------------------------------------------
 * `ls -l` of a system library directory is 58 entries, and 56 of them are symlinks
 * whose targets END with the link's own name:
 *
 *     libBrokenLocale.so      -> /lib/x86_64-linux-gnu/libBrokenLocale.so.1
 *     libMagickCore-6.Q16.so.6 -> libMagickCore-6.Q16.so.6.0.0
 *     libX11.so.6              -> libX11.so.6.4.0
 *
 * Measured on bench/holdout-x41/ls-l-real.txt: 56 of 58 targets satisfy the
 * relation, 0 satisfy the reverse direction, and 821 of the 1 123 target
 * characters are material the message has ALREADY PRINTED, one field to the left.
 * The target is not 30 characters of new information; it is a prefix of a string
 * already in the message plus a short tail.
 *
 * THE MECHANIC: THE ROW IS A CONSTRAINT SYSTEM, NOT A LIST OF CELLS
 * -----------------------------------------------------------------------------
 * Every exact codec in this stack treats a cell as an independent value. DAEDALUS
 * and SYNKOPE see strings; HYLE / BRACHYS / AUSTEROS / KANON see typed cells;
 * APOGRAPHE and METRON predict a cell from the SAME COLUMN of the row ABOVE (a
 * vertical, temporal relation); STICHOMYTHIA prints a column from an affine
 * program over a number; ECHO removes text entailed by threading; SYMPLOKE (X26)
 * learns a separator lattice. None of them has a rule of the form
 *
 *     this cell CONTAINS that cell plus an affix
 *
 * which is the relation a symlink, a derived key, a qualified name, or
 * `dir/file.o` over `dir/file.c` all satisfy. PROSPHYSIS turns that relation into
 * a rewrite: a field whose value is a SIBLING'S value with a tail is replaced by a
 * one-character marker plus the tail that is genuinely new, and the reader
 * re-derives the rest from the sibling it can still see.
 *
 * THE KEY IS 31 TOKENS, AND THAT IS THE WHOLE DESIGN CONSTRAINT
 * -------------------------------------------------------------
 * A one-chat codec pays for its own decoder out of the same budget it saves in.
 * Version 1 of the key spelled out both affix directions and every edge case: 105
 * tokens, which ate six sevenths of the gain on the only lane the codec wins
 * (measured 1 486 against 1 412). The shipped key is one sentence:
 *
 *     X74. Body first. Then per line, a last field §x means the target is the
 *     name before the arrow followed by x. Print only.
 *
 * The prefix direction (target ENDS with the name) is implemented and fuzz-tested,
 * but it is NOT admitted to a message: declaring it costs +74 key tokens and the
 * direction occurs ZERO times in the 29-lane corpus. That is a measured decision,
 * recorded as one — see `CANDIDATES` below.
 *
 * THE MARKER WAS VERIFIED, NOT CHOSEN
 * -----------------------------------
 * `bench/x74/t40.ts` measures candidates. § is 1 o200k token, absent from every
 * source lane, and — decisive — the PARENT FRONTIER NEURALIZES THE LISTING AND
 * STILL REPRODUCES THE MARKER BYTE FOR BYTE (parentRoundTrip true). A marker that
 * the parent's own glyph tape silently corrupts would make this codec a
 * data-loss bug; that is why the check is in the receipt.
 *
 * GREEDY? NO. TIME OR CPU? CPU.
 * -----------------------------------------------------------------------------
 * The relation is decided per line by string comparison — it is a total function,
 * not a search. The only decision is FIRE or NOT, and it is made by measuring the
 * COMPLETE message (key + the frontier's own encoding of the rewritten text)
 * against the frontier's complete message for the original text, in the same
 * process, and admitting only a strict improvement that decodes byte for byte.
 * No wall clock is read by any decision; the reported milliseconds are the
 * frontier's own cost of re-encoding the rewritten text.
 *
 * PRIOR ART, STATED NOT IMPLIED
 * -----------------------------
 * Front coding of sorted strings: Bentley & Sedgewick, "Fast Algorithms for
 * Sorting and Searching Strings" (SODA 1997) — references are the PREVIOUS KEY IN
 * A SORTED DICTIONARY. Shared-substring symbols: FSST, Boncz/Neumann/Leis
 * (SIGMOD 2020) — the reference is a SYMBOL TABLE the encoder ships. Cross-column
 * residual coding: Corra (VLDB 2024 workshop), 50-85 % over per-column coding —
 * requires a COLUMN STORE AND A DECLARED SCHEMA. In this repository: PARADEIGMA
 * (X39) writes a JSON field as a concatenation of constants and sibling values,
 * but only inside a schema it already parsed.
 *
 * PROSPHYSIS differs from all of them in what it does NOT have: no dictionary, no
 * symbol table, no column store, no schema, and no side channel. The reference is
 * a sibling cell in the same row of a message a reader must execute, recovered
 * from the text, and the whole message is gated. It is honest to call this a
 * schema-free, one-chat form of cross-column compression — and equally honest that
 * it recovers 5.7 %, not 50-85 %, because the frontier has already absorbed most
 * of the redundancy these systems remove.
 */

import { countTokens, type EncodingName } from './bpe';
import { tagstackFrontier, type TagstackResult } from './tagstack';

/** The marker: 1 o200k token, absent from every corpus lane, and reproduced
 *  byte-exactly by the parent frontier (bench/x74/t40.ts). */
export const MARK = '\u00a7';

export interface ProsphysisRow {
  /** the line as written into the wire */
  line: string;
  /** the relation used, or null for an untouched line */
  mark: 'suffix' | 'prefix' | null;
  /** characters of the target that the marker replaced */
  saved: number;
}

export interface ProsphysisResult {
  codec: 'prosphysis';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  applied: boolean;
  rows: number;
  rewritten: number;
  savedChars: number;
  direction: 'suffix' | 'prefix' | null;
  anchor: string | null;
  contractTokens: number;
  messageTokens: number;
  frontierTokens: number;
  frontierParent: string;
  notes: string;
}

/**
 * The decoder contract, in the message, as a total procedure. 31 o200k tokens as
 * measured in bench/x74/key4.ts. Every clause is load-bearing:
 *
 *    "Body first."   the body is itself a coded message with its own first line
 *    "per line"      the rewrite is line-local, so a reader can work top to bottom
 *    "a last field"  says exactly WHERE to look for the marker
 *    "§x means the target is the name before the arrow followed by x"
 *                    states the referent (the name before the arrow) and the
 *                    operation (concatenate), which is the whole relation
 *    "Print only."   output discipline
 */
export const PROSPHYSIS_KEY =
  `X74. Body first. Then per line, a last field ${MARK}x means the target is the name before the arrow followed by x. Print only.`;

/**
 * The relation. `field` is the last whitespace-delimited field on the arrow's left
 * side; `target` is the right side. Returns the affix that reconstructs the target
 * from the sibling, or null. Both directions are total functions; only the suffix
 * direction is admitted to a message (see the header).
 */
export function prosphysisRelation(
  field: string,
  target: string,
  dirs: Array<'suffix' | 'prefix'> = ['suffix', 'prefix'],
): { mark: 'suffix' | 'prefix'; middle: string } | null {
  if (!field || !target || target.includes(MARK)) return null;
  if (dirs.includes('suffix') && target.length > field.length && target.startsWith(field)) {
    return { mark: 'suffix', middle: target.slice(field.length) };
  }
  if (dirs.includes('prefix') && target.length > field.length && target.endsWith(field)) {
    const head = target.slice(0, target.length - field.length);
    if (head) return { mark: 'prefix', middle: head };
  }
  return null;
}

const ARROW = /^(.* -> )([^\s]+)(.*)$/;

/**
 * THE REWRITE. Deletion-only: every byte of every line it does not touch is passed
 * through unchanged, which is what makes a strict win on one lane possible without
 * disturbing another.
 */
export function prosphysisRewrite(
  text: string,
  dirs: Array<'suffix' | 'prefix'> = ['suffix'],
): { wire: string; rows: ProsphysisRow[]; rewritten: number; savedChars: number } {
  const rows: ProsphysisRow[] = [];
  let rewritten = 0;
  let savedChars = 0;
  for (const line of text.split('\n')) {
    const m = ARROW.exec(line);
    if (!m) { rows.push({ line, mark: null, saved: 0 }); continue; }
    const left = m[1];
    const target = m[2];
    const rest = m[3];
    const fieldMatch = /(\S+)$/.exec(left.slice(0, left.length - 4).trimEnd());
    const field = fieldMatch ? fieldMatch[1] : '';
    const rel = prosphysisRelation(field, target, dirs);
    if (!rel) { rows.push({ line, mark: null, saved: 0 }); continue; }
    const cell = rel.mark === 'suffix' ? `${MARK}${rel.middle}` : `${MARK}${rel.middle}${MARK}`;
    rows.push({ line: `${left}${cell}${rest}`, mark: rel.mark, saved: field.length });
    rewritten++;
    savedChars += field.length;
  }
  return { wire: rows.map((r) => r.line).join('\n'), rows, rewritten, savedChars };
}

/**
 * THE TOTAL INVERSE. Throws rather than guessing: a marker with no sibling, or a
 * double marker with an empty head, is a malformed message, not a text to be
 * approximated.
 */
export function prosphysisDecode(message: string): string {
  const out: string[] = [];
  for (const line of message.split('\n')) {
    const m = ARROW.exec(line);
    if (!m) { out.push(line); continue; }
    const left = m[1];
    const cell = m[2];
    const rest = m[3];
    if (!cell.startsWith(MARK)) { out.push(line); continue; }
    const fieldMatch = /(\S+)$/.exec(left.slice(0, left.length - 4).trimEnd());
    const field = fieldMatch ? fieldMatch[1] : '';
    if (!field) throw new Error('PROSPHYSIS: marker with no sibling name');
    const body = cell.slice(1);
    if (body.endsWith(MARK)) {
      const head = body.slice(0, -1);
      if (!head) throw new Error('PROSPHYSIS: empty head in the prefix direction');
      out.push(`${left}${head}${field}${rest}`);
    } else {
      out.push(`${left}${field}${body}${rest}`);
    }
  }
  return out.join('\n');
}

/**
 * ONE CANDIDATE, and the reason is the contract, not the search.
 *
 * The key declares the suffix direction only. A message that used the prefix
 * direction would be UNDECODABLE from that key by a cold reader — the reader would
 * print `x` where the source had `xname`. So the prefix direction is implemented
 * (`prosphysisRelation` and `prosphysisDecode` both handle it, and the fuzz in
 * t30 inverts 400 documents in both directions) but it is NOT admitted to a
 * message. Admitting it would need a second clause, and the two-clause key
 * measured 105 tokens against the 31-token one, on a direction that occurs zero
 * times in the corpus.
 */
const ADMITTED: Array<'suffix' | 'prefix'> = ['suffix'];

export function prosphysisEncode(text: string, enc: EncodingName = 'o200k_base'): ProsphysisResult {
  const frontier: TagstackResult = tagstackFrontier(text, enc);
  const refuse = (notes: string): ProsphysisResult => ({
    codec: 'prosphysis',
    wire: frontier.message,
    message: frontier.message,
    decoded: frontier.decoded,
    exact: frontier.decoded === text,
    applied: false,
    rows: 0, rewritten: 0, savedChars: 0, direction: null, anchor: null,
    contractTokens: 0,
    messageTokens: frontier.messageTokens,
    frontierTokens: frontier.messageTokens,
    frontierParent: frontier.parentCodec,
    notes,
  });

  const rw = prosphysisRewrite(text, ADMITTED);
  if (rw.rewritten === 0) return refuse('prosphysis: no sibling-affix relation fires');
  // gate 1: the codec's own inverse must reproduce the source exactly
  if (prosphysisDecode(rw.wire) !== text) return refuse('prosphysis: own inverse disagrees');

  // The rewritten text goes through the frontier as a CANDIDATE REPRESENTATION, so
  // the entailment compounds with whatever the stack already does on this lane.
  const inner: TagstackResult = tagstackFrontier(rw.wire, enc);
  // gate 1b: THE COMPOSITION IS CHECKED, NOT ARGUED. The reader of this message inverts
  // two layers — the frontier's own declared reader on the body, then the relation the
  // key states. The first layer is the frontier's own claim that it reproduces the text
  // it was given; if that fails on the REWRITTEN text (a different input from the
  // source it validated before), the composition is not exact and nothing ships.
  if (inner.decoded !== rw.wire) return refuse('prosphysis: frontier does not reproduce the rewritten body');
  const message = `${PROSPHYSIS_KEY}\n${inner.message}`;
  const tokens = countTokens(message, enc);

  // gate 2: the complete message must be strictly smaller than the frontier's
  if (tokens >= frontier.messageTokens) {
    return refuse(`prosphysis loses: ${tokens} vs ${frontier.messageTokens} (${frontier.parentCodec})`);
  }
  return {
    codec: 'prosphysis',
    wire: message,
    message,
    decoded: text,
    exact: true,
    applied: true,
    rows: text.split('\n').length,
    rewritten: rw.rewritten,
    savedChars: rw.savedChars,
    direction: 'suffix',
    anchor: inner.parentCodec,
    contractTokens: countTokens(PROSPHYSIS_KEY, enc),
    messageTokens: tokens,
    frontierTokens: frontier.messageTokens,
    frontierParent: frontier.parentCodec,
    notes: `${rw.rewritten} rows rewritten, ${rw.savedChars} chars entailed; wire coded by ${inner.parentCodec}`,
  };
}
