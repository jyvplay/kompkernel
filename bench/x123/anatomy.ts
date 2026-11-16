/** X123 ANATOMY — where the shipped tokens actually sit in the X123 frontier wires.
 *
 * ZERO encoder calls. Reads bench/x123/receipts/ab2-messages.jsonl (the shipped ON-arm
 * messages), splits each at the CHIRON frame `§tape¶body`, and reports, per lane:
 *   contract / tape / body  chars and tokens,
 *   rule count, mean rule value length, mean reference length,
 *   the price of the tape per char and of the body per char.
 *
 * This is the instrument that decides which layer a new mechanism must attack. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { chironParseTape, chironInScript, CHIRON_SCRIPTS, type ChironScript } from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const src = process.argv[2] ?? 'bench/x123/receipts/ab2-messages.jsonl';
const rows = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

const SCRIPTS: ChironScript[] = CHIRON_SCRIPTS;

interface Row {
  lane: string; on: number; chars: number; contract: number; tapeC: number; bodyC: number;
  tapeT: number; bodyT: number; rules: number; meanVal: number; rateT: number; rateB: number;
}
const out: Row[] = [];
let S = { on: 0, contract: 0, tapeC: 0, bodyC: 0, tapeT: 0, bodyT: 0, rules: 0 };

for (const r of rows) {
  const m: string = r.message;
  const i = m.indexOf('§');
  let contract = 0, tapeC = 0, bodyC = 0, tapeT = 0, bodyT = 0, rules = 0, meanVal = 0;
  if (i < 0) {
    contract = countTokens(m, enc);
  } else {
    const j = m.indexOf('¶', i + 1);
    const head = m.slice(0, i);
    const tape = j < 0 ? m.slice(i + 1) : m.slice(i + 1, j);
    const body = j < 0 ? '' : m.slice(j + 1);
    contract = countTokens(head, enc);
    tapeC = tape.length; bodyC = body.length;
    tapeT = countTokens(m.slice(i, j < 0 ? m.length : j + 1), enc);
    bodyT = countTokens(body, enc);
    for (const s of SCRIPTS) {
      const p = chironParseTape(tape, s);
      if (p) {
        rules = p.length;
        if (p.length) meanVal = p.reduce((a, x) => a + x.raw.length, 0) / p.length;
        break;
      }
    }
    if (!rules) {
      // fall back: count leading script characters
      let n = 0;
      for (const ch of tape) if (SCRIPTS.some(s => chironInScript(s, ch.codePointAt(0)!))) n++;
      rules = n;
    }
  }
  const row: Row = { lane: r.path.split('/').pop()!, on: r.onTokens, chars: m.length, contract,
    tapeC, bodyC, tapeT, bodyT, rules, meanVal: Math.round(meanVal * 10) / 10,
    rateT: tapeC ? tapeT / tapeC : 0, rateB: bodyC ? bodyT / bodyC : 0 };
  out.push(row);
  S.on += row.on; S.contract += row.contract; S.tapeC += row.tapeC; S.bodyC += row.bodyC;
  S.tapeT += row.tapeT; S.bodyT += row.bodyT; S.rules += row.rules;
}

out.sort((a, b) => b.on - a.on);
const H = (a: string, b: number) => a.padStart(b);
console.log(['lane'.padEnd(24), H('on',5), H('ctr',4), H('tapeT',6), H('bodyT',6), H('rules',6), H('tapeC',6), H('bodyC',6), H('tape/ch',7), H('body/ch',7), H('mval',6)].join(' '));
for (const r of out) {
  console.log([r.lane.padEnd(24), H(String(r.on),5), H(String(r.contract),4), H(String(r.tapeT),6), H(String(r.bodyT),6), H(String(r.rules),6), H(String(r.tapeC),6), H(String(r.bodyC),6), H(r.rateT.toFixed(3),7), H(r.rateB.toFixed(3),7), H(String(r.meanVal),6)].join(' '));
}
console.log(`\nΣ on ${S.on}  contract ${S.contract} (${(100 * S.contract / S.on).toFixed(1)}%)  tape ${S.tapeT} (${(100 * S.tapeT / S.on).toFixed(1)}%)  body ${S.bodyT} (${(100 * S.bodyT / S.on).toFixed(1)}%)  rules ${S.rules}  tape ${S.tapeC} chars @ ${(S.tapeT / S.tapeC).toFixed(3)}  body ${S.bodyC} chars @ ${(S.bodyT / S.bodyC).toFixed(3)}`);
fs.writeFileSync('bench/x123/receipts/anatomy.json', JSON.stringify({ totals: S, rows: out }, null, 2) + '\n');
