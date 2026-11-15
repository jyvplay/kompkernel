/**
 * X120 — SECOND-ORDER ADVERSARY for ΒΕΛΤΙΣΤΟΣ, derived from its own structure.
 *
 * The codec's load-bearing assumption is that a BPE merge cannot reach back
 * past the `ctx` characters carried in the DP state. A(C) attacks exactly that:
 *
 *  A1 LONG CHUNK      a pre-tokenizer chunk longer than the context window, so
 *                     the model's marginal costs are wrong. The gate must still
 *                     refuse anything that is not a real, exact win.
 *  A2 LIST COLLISION  a key letter smuggled into the payload through a LIST item
 *                     (the one reachable way the decoded text can contain a key).
 *  A3 OVERLAP         rule values that overlap at the same position; a path must
 *                     be a partition, never two substitutions over one span.
 *  A4 FORWARD REF     a later glyph would be cheaper inside an earlier rule's
 *                     value; using it would silently redefine the tape.
 *  A5 MODAL SHORTCUT  the dictionary is deleted from a winning message. If the
 *                     message could still be expanded, the tape was decoration
 *                     and the codec was relying on the reader's prior.
 *  A6 QUANTIFIER      the codec must be a function of the WIRE, not of the source
 *                     argument the chain happens to pass it.
 *  A7 CAP             an input beyond the declared character cap is a refusal.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { veltistosEncode, VELTISTOS_MAX_REF_CHARS } from '../../src/lib/omega/veltistos';
Object.assign(process.env, { OMEGA_DET: '1' });
delete process.env.OMEGA_NO_VELTISTOS; delete process.env.OMEGA_VELTISTOS;
delete process.env.OMEGA_VELTISTOS_LADDER; delete process.env.OMEGA_VELTISTOS_COLLAPSE;
delete process.env.OMEGA_VELTISTOS_WINDOW;
const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const CONTRACT = '¶k=v expand repeatedly print only.\n';
const wire = (tape: string, body: string) => CONTRACT + CHIRON_START + tape + CHIRON_SEP + body;
const exp = (m: string) => chironDecode(m.slice(m.indexOf(CHIRON_START)));
const inc = (m: string) => ({ message: m, messageTokens: T(m), decoded: '' });
const results: any[] = [];
let silentWrong = 0, claimedWinNotReal = 0, regressions = 0;

function probe(name: string, m: string, expectRefusal: RegExp | null = null) {
  const before = exp(m);
  const base = T(m);
  const r = veltistosEncode('unused source argument', enc, inc(m));
  const real = T(r.message);
  const after = r.message.indexOf(CHIRON_START) >= 0 ? exp(r.message) : r.message;
  const exact = after === before;
  if (r.applied && !exact) silentWrong++;
  if (r.applied && (real !== r.messageTokens || real >= base)) claimedWinNotReal++;
  if (real > base) regressions++;
  if (expectRefusal) assert.match(r.notes, expectRefusal, name);
  results.push({ name, base, real, applied: r.applied, exact, reported: r.messageTokens, notes: r.notes });
  console.log(`${name.padEnd(34)} base=${base} out=${real} applied=${r.applied} exact=${exact} ${r.applied ? r.notes.slice(0, 60) : ''}`);
}

// A1 — chunks far longer than the 24/32-character context window.
const longWord = 'x'.repeat(300);
const longDigits = '1'.repeat(300);
const longMixed = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
probe('A1 long letter chunk', wire('α' + longWord + 'β' + 'zz', Array.from({ length: 12 }, () => longWord + ' zz ' + longWord).join('\n')));
probe('A1 long digit chunk', wire('α' + longDigits + 'β' + 'q', Array.from({ length: 12 }, () => longDigits + ' q ' + longDigits).join('\n')));
probe('A1 case-boundary chunk', wire('α' + longMixed, Array.from({ length: 20 }, () => longMixed + ' ' + longMixed).join('\n')));
probe('A1 chunk exactly at the window', wire('α' + 'y'.repeat(24), Array.from({ length: 30 }, () => 'y'.repeat(24) + ' ' + 'y'.repeat(25)).join('\n')));

// A2 — the reachable collision path.
probe('A2 list-item key collision', wire('αabcβq qγ…,αx,αyδ× β3γ', 'δ'), /key letter occurs in the payload/);

// A3 — overlapping values at one position.
probe('A3 overlapping values', wire('αababβbabaγab', Array.from({ length: 30 }, () => 'ababababab').join('\n')));
probe('A3 nested values', wire('αabcdefghβcdeγef', Array.from({ length: 25 }, () => 'abcdefgh abcdefgh cde ef').join('\n')));

// A4 — a later glyph would be cheaper inside an earlier value.
probe('A4 forward-reference bait', wire('α' + 'internationalization' + 'β' + 'internationalization', Array.from({ length: 25 }, () => 'α β α').join('\n')));

// A6 — the source argument must not matter.
{
  const v = 'internationalization';
  const m = wire('α' + v, Array.from({ length: 40 }, (_, i) => `${v} ${i} ${v}`).join('\n'));
  const a = veltistosEncode('', enc, inc(m));
  const b = veltistosEncode('a completely different source text', enc, inc(m));
  assert.equal(a.message, b.message);
  results.push({ name: 'A6 source-argument independence', equal: true });
  console.log('A6 source-argument independence    PASS');
}

// A7 — beyond the declared cap.
{
  const big = 'q'.repeat(VELTISTOS_MAX_REF_CHARS + 10);
  const m = wire('αq', big);
  const r = veltistosEncode('x', enc, inc(m));
  assert.equal(r.applied, false);
  assert.match(r.notes, /chars > cap/);
  results.push({ name: 'A7 character cap', refused: true });
  console.log('A7 character cap                   REFUSED as declared');
}

// A5 — modal shortcut detector, on the real winning messages.
const screen = process.argv[2] ?? 'bench/x120/receipts/screen-shipped-chunkstate.jsonl';
let modal = 0, modalChecked = 0, prefixEqual = 0;
if (fs.existsSync(screen)) {
  const off = new Map<string, string>();
  for (const line of fs.readFileSync('bench/x119/receipts/frontier.jsonl', 'utf8').trim().split('\n')) {
    const r = JSON.parse(line); off.set(r.path, r.message);
  }
  for (const line of fs.readFileSync(screen, 'utf8').trim().split('\n')) {
    const r = JSON.parse(line);
    const m: string = r.message;
    const i = m.indexOf(CHIRON_START);
    if (i < 0) continue;
    const cut = m.indexOf(CHIRON_SEP, i + 1);
    if (cut < 0) continue;
    const full = chironDecode(m.slice(i));
    // delete the dictionary, keep the body: a reader with only a prior would
    // have to invent the expansion. The executable reader must NOT succeed.
    const stripped = CHIRON_START + CHIRON_SEP + m.slice(cut + 1);
    const without = chironDecode(stripped);
    modalChecked++;
    if (without !== full) modal++;
    const o = off.get(r.path);
    if (o && o.slice(0, o.indexOf(CHIRON_START)) === m.slice(0, i)) prefixEqual++;
  }
}
results.push({ name: 'A5 modal-shortcut detector', checked: modalChecked, dictionaryLoadBearing: modal, contractPrefixEqual: prefixEqual });
console.log(`A5 modal shortcut                  ${modal}/${modalChecked} messages cannot be expanded without the tape; contract prefix preserved on ${prefixEqual}/${modalChecked}`);

const receipt = { schema: 'kompkernel-x120-attack-lattice-v1', silentWrong, claimedWinNotReal, regressions,
  modalChecked, dictionaryLoadBearing: modal, contractPrefixEqual: prefixEqual, results };
fs.writeFileSync('bench/x120/receipts/attack-lattice.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(`\nATTACK SUMMARY silentWrong=${silentWrong} claimedWinNotReal=${claimedWinNotReal} regressions=${regressions}`);
if (silentWrong || claimedWinNotReal || regressions) process.exitCode = 1;
if (modalChecked && modal !== modalChecked) process.exitCode = 1;
