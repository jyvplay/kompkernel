/**
 * X97 — PARSE/SERIALISE ROUND-TRIP.  If `serialise(order=[0..n-1])` does not reproduce the incumbent
 * tape byte for byte, then every price ΜΕΤΑΤΑΞΙΣ computes is the price of a DIFFERENT string from the
 * one it emits, and `messageTokens` and `message` disagree -- which is exactly the shape of a
 * regression that `admit` cannot catch, because admit trusts `messageTokens`.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
function parseTape(tape: string): { keys: string[]; values: string[] } {
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { keys, values };
}
let bad = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires')) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t);
  const { keys, values } = parseTape(tape);
  let re = '';
  for (let i = 0; i < keys.length; i++) re += keys[i] + values[i];
  const ok = re === tape;
  if (!ok) {
    bad++;
    console.log(`ROUND-TRIP FAIL ${f}: rules=${keys.length} tapeLen=${tape.length} reLen=${re.length}`);
    // locate the first divergence
    let i = 0; while (i < Math.min(re.length, tape.length) && re[i] === tape[i]) i++;
    console.log(`   first divergence at ${i}: tape=${JSON.stringify(tape.slice(Math.max(0, i - 30), i + 30))}`);
    console.log(`                          re  =${JSON.stringify(re.slice(Math.max(0, i - 30), i + 30))}`);
  }
}
console.log(`\nwires: ${fs.readdirSync('bench/x87/receipts/wires').length}  round-trip failures: ${bad}`);
