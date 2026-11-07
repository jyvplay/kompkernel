/**
 * X76 / t4 — THE DECISIVE TEST for the padding mechanic.
 *
 * Does the PARENT FRONTIER produce a smaller message on the squeezed text than on the
 * original? This is item #10: improve the representation SEEN BY the parent frontier.
 * The saving measured here is an UPPER BOUND — a real codec must also pay for the
 * declaration that lets the reader restore the padding.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const squeezed = t.replace(/ {2,}/g, ' ');
  const a: any = tagstackEncode(t, enc);
  const b: any = tagstackEncode(squeezed, enc);
  rows.push({ path: p, orig: a.messageTokens, squeezed: b.messageTokens, gain: a.messageTokens - b.messageTokens,
    rawSave: countTokens(t, enc) - countTokens(squeezed, enc), exactA: a.decoded === t, exactB: b.decoded === squeezed });
  console.log(`${p.split('/').pop()!.padEnd(22)} frontier ${String(a.messageTokens).padStart(5)} -> squeezed ${String(b.messageTokens).padStart(5)}  GAIN ${String(a.messageTokens - b.messageTokens).padStart(5)}  (raw save was ${countTokens(t, enc) - countTokens(squeezed, enc)})`);
  fs.writeFileSync('bench/x76/receipts/squeeze-frontier.json', JSON.stringify(rows, null, 1) + '\n');
}
console.log(`\nTOTAL frontier ${rows.reduce((x, y) => x + y.orig, 0)} -> ${rows.reduce((x, y) => x + y.squeezed, 0)}  GAIN ${rows.reduce((x, y) => x + y.gain, 0)}`);
