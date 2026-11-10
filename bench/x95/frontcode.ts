/**
 * X95/X96 — IS THE TAPE'S VALUE COLUMN FRONT-CODABLE?
 *
 * WHY THIS IS NOT ANY OF THE ELEVEN CLOSURES. Every previous attempt on the tape's values asked
 * "is there a shared substring worth turning into a RULE" -- tape-prefix.ts and tape-suffix.ts
 * priced exactly that and found 0 wins in 45 and 0 in 116. A rule costs a reference, and a
 * reference costs about one token, so a four-character prefix costing ~1.5 tokens cannot pay for
 * itself at multiplicity two.
 *
 * Front coding is a different object. It does not create a reference at all. It SORTS the entries
 * and stores, for each value, only the LENGTH of the prefix it shares with the previous value plus
 * the remainder. The shared prefix is never written down; only a single digit is. That is the
 * classical incremental encoding of a sorted string dictionary, and it is the one transform whose
 * cost per site is a digit rather than a token.
 *
 * WHY THE TAPE ORDER IS FREE. The tape is positional -- a rule must be defined before its first
 * reference -- but the entire tape precedes the body, so ANY permutation of the entries is legal.
 * "Tape reordering is worth 1-2 tokens" was measured as a token optimisation and is not contradicted
 * here: the reordering is not the win, it is what makes the win expressible.
 *
 * WHAT IS MEASURED. For each committed wire: the tape's values sorted, the shared-prefix length
 * with the previous value for every entry, the total characters that would stop being written, and
 * the exact token price of writing those lengths as single digits in the same positions. The
 * difference is the arm's value on that lane's tape, before any contract tax.
 *
 * ZERO frontier calls, zero encodes.
 */
import { countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);

function parseTape(tape: string): { g: string; v: string }[] {
  const seen = new Set<string>();
  const ents: { g: string; v: string }[] = [];
  let cur: { g: string; v: string } | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; ents.push(cur); }
    else if (cur) cur.v += ch;
  }
  return ents;
}

const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'front-coding headroom on the tape value column; zero frontier calls', lanes: [] };
let T = { ents: 0, saved: 0, lenTok: 0, valTok: 0, cap9: 0 };
L.push('lane'.padEnd(14) + 'ents  valTok  sharedPrefixChars  lenTok(1 digit each)  NET  with L capped at 9');
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const tape = wire.slice(sec + 1, pil);
  const ents = parseTape(tape);
  const valTok = ents.reduce((a, e) => a + ct(e.v), 0);
  const sorted = [...ents].sort((a, b) => (a.v < b.v ? -1 : a.v > b.v ? 1 : 0));
  let saved = 0, cap9 = 0;
  const lens: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1].v, b = sorted[i].v;
    let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++;
    lens.push(k); saved += k; cap9 += Math.min(k, 9);
  }
  // the exact price of writing those lengths as single digits, one per entry, in tape order
  const lenStr = lens.map(k => String(Math.min(k, 9))).join('');
  const lenTok = ct(lenStr);
  const net = Math.round((saved / 2.59) * 100) / 100 - lenTok;
  L.push(name.padEnd(14) + String(ents.length).padStart(4) + String(valTok).padStart(8) +
    String(saved).padStart(19) + String(lenTok).padStart(23) + String(net).padStart(7) + String(cap9).padStart(8));
  receipt.lanes.push({ lane: name, entries: ents.length, valueTokens: valTok, sharedPrefixChars: saved,
    lengthDigitsTokens: lenTok, netUpperBound: net, sharedPrefixCharsCappedAt9: cap9 });
  T.ents += ents.length; T.saved += saved; T.lenTok += lenTok; T.valTok += valTok; T.cap9 += cap9;
}
L.push('-'.repeat(100));
L.push(`TOTAL: entries ${T.ents}  value tokens ${T.valTok}  shared-prefix chars ${T.saved} (capped at 9: ${T.cap9})  length-digit tokens ${T.lenTok}`);
L.push('');
L.push('reading: shared-prefix chars are converted at the measured 2.59 ch/tok value density, which');
L.push('is an UPPER bound on the saving because a character removed from a value is not always worth');
L.push('1/2.59 of a token in context. The length digits are priced exactly. NET is therefore');
L.push('optimistic, and the contract tax for describing front coding (the measured break-even for a');
L.push('new contract clause is ~20-25 tokens) is NOT subtracted. A positive NET here is necessary');
L.push('but not sufficient; a negative one closes the lever outright.');
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/frontcode.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/frontcode.log', log);
console.log(log);
