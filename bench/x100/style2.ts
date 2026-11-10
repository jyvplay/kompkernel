/**
 * X100 — ΣΤΗΛΗ, MEASURED CORRECTLY: REPEATED ANCHOR SUBSEQUENCES WITH DATA INTERLEAVED.
 *
 * style.ts scanned for a FIXED token period and found 0.014-0.069 -- but real tables have VARIABLE
 * row lengths, so no fixed period ever aligns them.  That measurement was wrong, not the mechanism.
 *
 * THE RIGHT SIGNAL.  A straight-line program extracts repeated CONTIGUOUS substrings, so it can only
 * pull out anchors that sit next to each other in the body.  In a columnar table the anchors are
 * separated by data, so their ORDER repeats but their adjacency does not -- and no substring rule
 * can reach that.  ΧΕΙΡΟΝ's `× b t n L…` reaches it: t is the row template with a blank per column,
 * and each column is a list rule.
 *
 * THIS PROBE.  Drop the body's literal tokens and keep only the sequence of REFERENCE tokens.  Find
 * the most frequent contiguous n-gram of that reduced sequence.  If it occurs c times with n >= 2
 * anchors, that is a columnar template the SLP cannot express, and the exact `×` price is
 *
 *     gain = (c - 1) * n            -- the anchors stop being re-spelled on every row
 *          - (1 + 1 + 1 + tpl + digits + n)   -- the × rule itself
 *          - n * (1 + 1 + 1)                  -- one list rule per column
 *
 * The data tokens are NOT saved by `×`; they move from the body into the list rules.  So the gain is
 * exactly the anchors' recurrence, minus the machinery.
 */
import * as fs from 'node:fs';
import { tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const isRef = (s: string): boolean => s.length === 1 && s.codePointAt(0)! > 0x370;
const rows: any[] = [];
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const T = tokenStrings(msg.slice(t + 1), enc).map(x => x.s);
  const R = T.filter(isRef);                      // the anchor sequence
  let best = { n: 0, c: 0, gram: '' };
  for (let n = 2; n <= 8 && n <= R.length; n++) {
    const cnt = new Map<string, number>();
    for (let i = 0; i + n <= R.length; i++) {
      const g = R.slice(i, i + n).join('');
      cnt.set(g, (cnt.get(g) ?? 0) + 1);
    }
    for (const [g, c] of cnt) if (c > best.c || (c === best.c && n > best.n)) best = { n, c, gram: g };
  }
  const { n, c } = best;
  const tpl = Math.max(1, Math.round(n * 0.7));       // template letters, allowing some fusion
  const costX = 1 + 1 + 1 + tpl + 1 + n;              // key, ×, blank, template, digits, list letters
  const costLists = n * 3;                            // per column: key, …, sep
  const saving = c > 1 ? (c - 1) * n : 0;
  const net = saving - costX - costLists;
  rows.push({ lane: f, bodyTokens: T.length, refs: R.length, bestN: n, bestC: c, gram: best.gram, saving, costX, costLists, net });
  console.log(`${f.padEnd(20)} body=${String(T.length).padStart(5)} refs=${String(R.length).padStart(5)}  best gram n=${n} x${String(c).padStart(3)}  ${best.gram.padEnd(10)} saving=${String(saving).padStart(4)} cost=${String(costX + costLists).padStart(4)} NET=${String(net).padStart(5)}`);
}
const tot = rows.reduce((a, r) => a + Math.max(0, r.net), 0);
console.log(`\nΣΤΗΛΗ (corrected): pooled positive net = ${tot} tokens over the ten wires (${(100 * tot / 7844).toFixed(2)}% of 7 844)`);
fs.writeFileSync('bench/x100/receipts/style2.json', JSON.stringify({ rows, pooledPositiveNet: tot }, null, 1));
