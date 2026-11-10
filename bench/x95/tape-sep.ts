/**
 * X95 — THE TAPE IS SERIALISED WITH NO SEPARATOR, AND NO OBJECTIVE HAS EVER PRICED THAT CHOICE.
 *
 * THE GAP. The tape is `g1 v1 g2 v2 ...` concatenated: a rule's glyph is immediately followed by
 * its value, and the next entry's glyph immediately follows the previous value. Every objective in
 * the stack that touches the tape -- ARIADNE's glyph assignment, METATHESIS's relabelling, X94's
 * ADD/REMOVE/FACTOR census -- prices the tape as a STRING and never asks whether the serialisation
 * itself is well chosen. The glyph column measures 502 tokens for 600 entries, 0.84 per glyph, and
 * a glyph is the single most expensive character class in the message: a Cyrillic character costs
 * ~0.9 tokens where an English character costs ~0.23.
 *
 * THE OBSERVATION THAT MAKES IT A LEVER. vocab-bridge.ts established that a single non-ASCII
 * character immediately after a single space is absorbed into that space's token -- ct(" а") = 1
 * while ct("а") = 1, so the glyph is free given the space, and a space after a letter or a digit is
 * itself free because "e " and "9 " are vocabulary tokens. If both halves hold on the real tapes,
 * then inserting one separator per entry costs nothing and removes 0.84 tokens per entry.
 *
 * WHAT IS MEASURED. For each committed wire, the exact token count of the tape under four
 * serialisations: as shipped; a space before each entry's glyph; a space between glyph and value;
 * and a newline before each glyph. The deltas are exact counts on legal tapes, and the separator
 * count is reported so a saving can never be confused with a deletion.
 *
 * ZERO frontier calls, zero encodes.
 */
import { countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);

/** the entry-start glyphs of a tape, in order, with the byte offsets at which they begin */
function entryStarts(tape: string): number[] {
  const seen = new Set<string>();
  const at: number[] = [];
  for (let i = 0; i < tape.length; i++) {
    const ch = tape[i];
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); at.push(i); }
  }
  return at;
}

const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'exact token cost of the tape under four serialisations; zero frontier calls', lanes: [] };
let T = { tape: 0, sp: 0, spv: 0, nl: 0, ents: 0 };
L.push('lane'.padEnd(14) + 'ents  tapeTok  +space-before  Δ   +space-after  Δ   +newline-before  Δ');
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const tape = wire.slice(sec + 1, pil);
  const at = entryStarts(tape);
  const set = new Set(at);

  const spBefore: string[] = [];
  const spAfter: string[] = [];
  const nlBefore: string[] = [];
  for (let i = 0; i < tape.length; i++) {
    if (set.has(i)) { spBefore.push(' '); nlBefore.push('\n'); }
    spBefore.push(tape[i]);
    nlBefore.push(tape[i]);
    spAfter.push(tape[i]);
    if (set.has(i)) spAfter.push(' ');
  }
  const t0 = ct(tape), t1 = ct(spBefore.join('')), t2 = ct(spAfter.join('')), t3 = ct(nlBefore.join(''));
  L.push(name.padEnd(14) + String(at.length).padStart(4) + String(t0).padStart(9) +
    String(t1).padStart(13) + String(t1 - t0).padStart(4) +
    String(t2).padStart(13) + String(t2 - t0).padStart(4) +
    String(t3).padStart(15) + String(t3 - t0).padStart(4));
  receipt.lanes.push({ lane: name, entries: at.length, tapeTokens: t0,
    spaceBeforeGlyph: t1, deltaSpaceBeforeGlyph: t1 - t0,
    spaceAfterGlyph: t2, deltaSpaceAfterGlyph: t2 - t0,
    newlineBeforeGlyph: t3, deltaNewlineBeforeGlyph: t3 - t0 });
  T.tape += t0; T.sp += t1 - t0; T.spv += t2 - t0; T.nl += t3 - t0; T.ents += at.length;
}
L.push('-'.repeat(96));
L.push(`TOTAL: entries ${T.ents}  tape ${T.tape}  Δ space-before-glyph ${T.sp}  Δ space-after-glyph ${T.spv}  Δ newline-before-glyph ${T.nl}`);
L.push('');
L.push('reading: a NEGATIVE delta is a saving on the tape alone, before any change to the contract');
L.push('that would have to describe the new separator, and before any effect on the body. The');
L.push('separator is inserted once per entry, so a saving is not a deletion: the entry count is');
L.push('unchanged and the parse is unambiguous either way, because an entry still begins at the');
L.push('first appearance of each glyph.');
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/tape-sep.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/tape-sep.log', log);
console.log(log);
