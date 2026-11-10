/**
 * X97 — ARE THE WIRE LANGUAGE'S TWO OPERATORS (× U+00D7, … U+2026) USED AT ALL IN THE SHIPPED
 * WIRES, AND WHAT WOULD THEY BUY ON THE COLUMNAR LANES?  The census found ten delimiter-free
 * columnar lanes, all currently won by SYNKRISIS (a grammar), not by a column program -- and the
 * leaders report 23.9-26.2% headroom on the ops categories.  × with an indexed fill IS a columnar
 * encoder that lives in the tape.  This measures whether it is already spent.
 */
import * as fs from 'node:fs';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const W = 'bench/x87/receipts/wires/';
let used = 0;
for (const f of fs.readdirSync(W)) {
  const msg = fs.readFileSync(W + f, 'utf8');
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t), body = msg.slice(t + 1);
  const rep = (tape.match(/×/g) || []).length, lst = (tape.match(/…/g) || []).length;
  if (rep || lst) { used++; console.log(`${f}: tape ×=${rep} …=${lst}`); }
}
console.log(`\ncommitted wires using an operator: ${used} / ${fs.readdirSync(W).length}`);
console.log(`frames: § count = ${[...fs.readFileSync(W + fs.readdirSync(W)[0], 'utf8')].filter(c => c === CHIRON_START).length}, ¶ count = ${[...fs.readFileSync(W + fs.readdirSync(W)[0], 'utf8')].filter(c => c === CHIRON_SEP).length} (first wire)`);
