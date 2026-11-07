/**
 * X77 / t1 — THE MARGINAL-RATE MAP.
 *
 * This is the experiment X76 named as its next highest-information test.
 *
 * X76 established that the frontier compresses inter-column padding at an 8.2x MARGINAL
 * rate (remove 469 raw tokens -> the message shrinks by 57) while its AVERAGE rate is
 * 2.9x. A marginal rate near 1.0 means the frontier passes that class through almost
 * verbatim: that is where a codec can still win. A rate near 0.1 means the frontier
 * already owns it.
 *
 *   rate(c) = ( F(S) - F(A_c(S)) ) / ( raw(S) - raw(A_c(S)) )
 *
 * Classes ablated here:
 *   pad      runs of >=2 spaces collapsed to one
 *   ws       every whitespace run collapsed to one space (newlines kept)
 *   digits   every digit replaced by '0'
 *   case     everything lowercased
 *   long     long identifier/path runs replaced by a fixed marker
 *   shuffle  line order reversed
 *   punct    punctuation removed
 *
 * CAUTION ON INTERPRETATION: an ablation that changes the *structure* of the document
 * (shuffle, punct) also changes what the frontier can mine, so its rate is a property of
 * the frontier's search and not a clean per-class price. The content-preserving classes
 * (digits, case, long) are the clean ones.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';

const ABL: Array<[string, (s: string) => string]> = [
  ['pad', (s) => s.replace(/ {2,}/g, ' ')],
  ['ws', (s) => s.split('\n').map((l) => l.replace(/\s+/g, ' ')).join('\n')],
  ['digits', (s) => s.replace(/[0-9]/g, '0')],
  ['case', (s) => s.toLowerCase()],
  ['long', (s) => s.replace(/[A-Za-z0-9_./-]{10,}/g, (m) => 'X'.repeat(m.length))],
  ['shuffle', (s) => s.split('\n').reverse().join('\n')],
  ['punct', (s) => s.replace(/[^\w\s]/g, '')],
];

const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const S = fs.readFileSync(p, 'utf8');
  const rawS = T(S, enc);
  const FS: any = tagstackEncode(S, enc);
  const line: any = { path: p, raw: rawS, frontier: FS.messageTokens, rates: {} };
  const parts: string[] = [];
  for (const [name, f] of ABL) {
    const A = f(S);
    const rawA = T(A, enc);
    const FA: any = tagstackEncode(A, enc);
    const dRaw = rawS - rawA;
    const dF = FS.messageTokens - FA.messageTokens;
    const rate = dRaw === 0 ? NaN : +(dF / dRaw).toFixed(3);
    line.rates[name] = { dRaw, dF, rate };
    parts.push(`${name} ${String(dRaw).padStart(5)}/${String(dF).padStart(5)} r=${Number.isNaN(rate) ? '  n/a' : rate.toFixed(2)}`);
    fs.writeFileSync('bench/x77/receipts/marginal-map.json', JSON.stringify(rows, null, 1) + '\n');
  }
  rows.push(line);
  console.log(`${p.split('/').padEnd ? p.split('/').pop()!.padEnd(22) : ''} raw ${String(rawS).padStart(5)} F ${String(FS.messageTokens).padStart(5)} | ${parts.join(' | ')}`);
}
console.log('\nrate = (frontier saved) / (raw saved).  ~1.0 = the frontier is BLIND here (headroom).  ~0.1 = it already owns it.');
