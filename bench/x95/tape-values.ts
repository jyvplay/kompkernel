/**
 * X95 — THE TAPE'S VALUES: 1 578 TOKENS THAT NO OBJECTIVE HAS EVER PRICED AS A POPULATION.
 *
 * THE GAP. Every objective that touches the tape prices it as a string. The values are never
 * examined as a population: their density, their length distribution, how many begin with a digit
 * (where the vocabulary contains ZERO bridge tokens, so a glyph can never merge into them), and
 * how many share a long prefix with another value. Those four numbers say whether there is any
 * headroom left in the largest single block of the message after the body.
 *
 * WHAT IS MEASURED. For each committed wire: the tape's total token count, the exact character
 * and token count of its values, the resulting density against the 3.0 ch/tok digit ceiling and
 * the ~4.3 ch/tok English ceiling, the fraction of values beginning with a digit, and the number
 * of value pairs sharing a prefix of >= 4 characters. A value that begins with a digit can never
 * absorb its glyph, so that fraction bounds how much of the 502-token glyph column is
 * structurally unreachable.
 *
 * ZERO frontier calls, zero encodes.
 */
import { countTokensExact, type EncodingName } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = (process.env.X95_ENC ?? 'o200k_base') as EncodingName;
const ct = (s: string) => countTokensExact(s, ENC);

const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'tape value population census; zero frontier calls', lanes: [] };
let T = { tape: 0, valCh: 0, valTok: 0, vals: 0, digitStart: 0, pureDigit: 0, pref4: 0 };
L.push('lane'.padEnd(14) + 'ents  tapeTok  valChars  valTok  ch/tok  %digitStart  %pureDigit  pairs sharing >=4-char prefix');
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const sec = wire.indexOf('§'), pil = wire.indexOf('¶', sec);
  const tape = wire.slice(sec + 1, pil);
  const seen = new Set<string>(); const vals: string[] = []; let cur: string | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = ''; vals.push(cur); }
    else if (cur !== null) { vals[vals.length - 1] += ch; }
  }
  const valCh = vals.reduce((a, v) => a + v.length, 0);
  const valTok = vals.reduce((a, v) => a + ct(v), 0);
  const digitStart = vals.filter(v => /^[0-9]/.test(v)).length;
  const pureDigit = vals.filter(v => /^[0-9]+$/.test(v)).length;
  // pairs sharing a >=4-char prefix: sorted, so only neighbours can share a long prefix
  const sorted = [...vals].sort();
  let pref4 = 0;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1], b = sorted[i];
    let k = 0; while (k < 4 && a[k] !== undefined && a[k] === b[k]) k++;
    if (k >= 4) pref4++;
  }
  L.push(name.padEnd(14) + String(vals.length).padStart(4) + String(ct(tape)).padStart(9) +
    String(valCh).padStart(10) + String(valTok).padStart(8) + (valCh / Math.max(1, valTok)).toFixed(2).padStart(8) +
    (100 * digitStart / Math.max(1, vals.length)).toFixed(1).padStart(12) +
    (100 * pureDigit / Math.max(1, vals.length)).toFixed(1).padStart(13) + String(pref4).padStart(14));
  receipt.lanes.push({ lane: name, entries: vals.length, tapeTokens: ct(tape), valueChars: valCh, valueTokens: valTok,
    density: valCh / Math.max(1, valTok), pctDigitStart: 100 * digitStart / Math.max(1, vals.length),
    pctPureDigit: 100 * pureDigit / Math.max(1, vals.length), pairsSharingPrefix4: pref4 });
  T.tape += ct(tape); T.valCh += valCh; T.valTok += valTok; T.vals += vals.length;
  T.digitStart += digitStart; T.pureDigit += pureDigit; T.pref4 += pref4;
}
L.push('-'.repeat(104));
L.push(`TOTAL: entries ${T.vals}  tape ${T.tape}  value chars ${T.valCh}  value tokens ${T.valTok}  density ${(T.valCh / T.valTok).toFixed(2)} ch/tok  digit-start ${(100 * T.digitStart / T.vals).toFixed(1)}%  pure-digit ${(100 * T.pureDigit / T.vals).toFixed(1)}%  prefix-sharing pairs ${T.pref4}`);
L.push('');
L.push('reading: the digit ceiling is 3.0 ch/tok and English prose ~4.3. A density at or above 4.3');
L.push('means the values are already priced as well as English text can be, and the only remaining');
L.push('lever would be the glyph column, whose unreachable fraction is exactly the digit-start');
L.push('percentage -- a glyph followed by a digit can never merge, because o200k_base contains no');
L.push('token mixing a digit with a non-ASCII character (boundary-census.ts: DIGIT bridges = 0).');
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/tape-values.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/tape-values.log', log);
console.log(log);
