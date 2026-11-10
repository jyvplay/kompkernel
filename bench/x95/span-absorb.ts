/**
 * X95 — CAN A SINGLE-OCCURRENCE LITERAL SPAN PAY FOR ITSELF BY WELDING TWO RUNS TOGETHER?
 *
 * WHAT THE STACK ALREADY MEASURED. X94's census priced 1 709 ADD+FACTOR moves by counting the
 * COMPLETE message, and the corrected screen `est - 3.1 - k*sigma` pruned 100 % of them. But every
 * candidate in that census came from a census of REPEATED substrings. A span that occurs exactly
 * once was never a candidate, so the run-coalescence bonus was never priced for it.
 *
 * WHY THE BONUS EXISTS AT ALL. The body alternates runs and literal spans. Absorbing a span into a
 * new rule turns `A s B` into `A P B` -- a single run of a+1+b glyphs instead of two runs of a and
 * b separated by s. run-curve.ts measured the price of that: a run of length 1 costs 1.000 tokens,
 * length 2 costs 1.208, length 3 costs 1.802. So welding two 1-runs into a 3-run costs 1.802
 * instead of 2.000 + ct(s), and the span's own cost leaves the body entirely.
 *
 * THE EXACT TEST. The tape is positional -- a rule must be defined before its first reference --
 * but the tape precedes the body, so a NEW entry may be APPENDED to the end of the tape and still
 * be defined before the body uses it. That makes the move exactly priceable: count
 * ct(contract + '§' + tape + P + s + '¶' + newBody) and subtract ct(wire). No estimate, no proxy,
 * no re-expansion of anything else. P is a glyph absent from the wire, chosen from the same
 * Cyrillic pool the stack already uses so the comparison is not flattered by an exotic alphabet.
 *
 * WHAT WOULD CLOSE THE LEVER. If the exact delta is non-negative for every single-occurrence span
 * on every lane, then the reference structure is at a genuine local optimum and the run-coalescence
 * bonus -- whatever it is worth -- cannot pay the ~4-token cost of a tape entry. A negative delta
 * somewhere is an arm, and the size of the most negative delta is the arm's value.
 *
 * ZERO frontier calls, zero encodes of any lane; every price is an exact countTokens on a string
 * that is a legal message.
 */
import { countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);
const CYRILLIC = 'абвгдежзийклмнопрстуфхцчшщъыьэюяАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';

// a fresh glyph: the first Cyrillic character that does not occur anywhere in the message
function freshGlyph(wire: string): string {
  for (const c of CYRILLIC) if (!wire.includes(c)) return c;
  for (let cp = 0x430; cp <= 0x44f; cp++) { const c = String.fromCodePoint(cp); if (!wire.includes(c)) return c; }
  throw new Error('pool exhausted');
}

const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'exact whole-message delta for absorbing a single-occurrence span; zero frontier calls', lanes: [] };
let T = { spans: 0, wins: 0, best: 0, sumDelta: 0 };
L.push('lane'.padEnd(14) + 'msgTok  spans  absorbable  WINS  best delta  sum delta  (best cases: span -> delta)');
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const contract = wire.slice(0, sec), tape = wire.slice(sec + 1, pil), body = wire.slice(pil + 1);
  const G = new Set<string>();
  for (const ch of tape) if (ch.codePointAt(0)! > 127) G.add(ch);

  // split the body into an alternating list of runs and spans
  type Seg = { kind: 'run' | 'span'; text: string };
  const segs: Seg[] = [];
  let i = 0;
  while (i < body.length) {
    const isRun = G.has(body[i]);
    let j = i;
    while (j < body.length && G.has(body[j]) === isRun) j++;
    segs.push({ kind: isRun ? 'run' : 'span', text: body.slice(i, j) });
    i = j;
  }

  // a span is absorbable if it has a run on BOTH sides and does not already occur elsewhere
  const counts = new Map<string, number>();
  for (const s of segs) if (s.kind === 'span') counts.set(s.text, (counts.get(s.text) ?? 0) + 1);

  const P = freshGlyph(wire);
  let spans = 0, wins = 0, best = 0, sum = 0;
  const cases: { span: string; delta: number }[] = [];
  for (let k = 1; k < segs.length - 1; k++) {
    const s = segs[k];
    if (s.kind !== 'span') continue;
    const A = segs[k - 1], B = segs[k + 1];
    if (A.kind !== 'run' || B.kind !== 'run') continue;
    if ((counts.get(s.text) ?? 0) !== 1) continue;   // single-occurrence only: the repeated case is X94's
    spans++;
    const newBody = body.slice(0, segs[k - 1].text.length === 0 ? 0 : 0); // placeholder, built below
    // build the new body by replacing the span with P
    const before = segs.slice(0, k).map(x => x.text).join('');
    const after = segs.slice(k + 1).map(x => x.text).join('');
    const nb = before + P + after;
    const newMsg = contract + '§' + tape + P + s.text + '¶' + nb;
    const delta = ct(newMsg) - ct(wire);
    if (delta < 0) wins++;
    if (delta < best) best = delta;
    sum += delta;
    if (delta < 0) cases.push({ span: s.text, delta });
  }
  cases.sort((a, b) => a.delta - b.delta);
  L.push(name.padEnd(14) + String(ct(wire)).padStart(6) + String(spans).padStart(6) + String(spans).padStart(12) +
    String(wins).padStart(6) + String(best).padStart(11) + String(sum).padStart(10) + '  ' +
    cases.slice(0, 3).map(c => JSON.stringify(c.span.slice(0, 22)) + ':' + c.delta).join(' '));
  receipt.lanes.push({ lane: name, msgTokens: ct(wire), absorbableSingleOccurrenceSpans: spans, wins, bestDelta: best, sumDelta: sum, bestCases: cases.slice(0, 5) });
  T.spans += spans; T.wins += wins; T.best = Math.min(T.best, best); T.sumDelta += sum;
}
L.push('-'.repeat(110));
L.push(`TOTAL: absorbable single-occurrence spans ${T.spans}  WINS ${T.wins}  best delta ${T.best}  sum delta ${T.sumDelta}`);
L.push('');
L.push('reading: delta is the EXACT change in the token count of the complete message when the span');
L.push('is absorbed into an appended tape entry. A negative delta is a real saving; the sum of the');
L.push('negatives would be the arm\'s value if the moves were independent, which they are not -- each');
L.push('absorption changes the run structure the next one sees, so the realisable figure is below');
L.push('the sum. A single fresh glyph P was used for every candidate; the shipped codec could');
L.push('choose P per candidate, which can only lower the deltas, so this is a conservative reading.');
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/span-absorb.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/span-absorb.log', log);
console.log(log);
