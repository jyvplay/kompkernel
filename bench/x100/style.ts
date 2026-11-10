/**
 * X100 — ΣΤΗΛΗ (style, "column"): IS THERE COLUMNAR STRUCTURE AN SLP CANNOT REACH?
 *
 * THE GAP.  A straight-line program extracts repeated CONTIGUOUS substrings.  A columnar table has
 * repeated INTERLEAVED structure: the same anchors recur at a fixed period, with different data
 * between them.  No substring rule can capture that, so the anchors are re-spelled in full on every
 * row.  ΧΕΙΡΟΝ's `×` operator CAN capture it -- `× b t n L…` writes a template n times and fills
 * each blank from a per-column list -- and it is UNUSED in all ten committed wires (bench/x97/
 * receipts/ops.ts: 0/10).
 *
 * WHY NOBODY HAS TRIED IT AS A POST-PASS.  X96 measured ΧΕΙΡΟΝ's block/column machinery as a
 * FRONTIER CANDIDATE (+21 % worse, 0 lanes better) -- i.e. as a replacement encoder competing with
 * the whole stack.  Adding ONE `×` rule (plus its column lists) on top of the grammar the frontier
 * already produced is a different, untested construction.
 *
 * THIS PROBE.  For each wire, tokenize the BODY and measure its periodicity: for each candidate row
 * length L, the fraction of positions where the token equals the token L later.  A high fraction at
 * some L is the signature of a columnar table whose anchors an SLP must re-spell every row.  Then
 * price, exactly, what a `×` rule would cost for the best L:
 *
 *     gain = (n_rows - 1) * anchor_tokens_per_row  -  overhead(× rule + column lists)
 *
 * A bound is never an admission; this only decides whether the mechanism is worth building.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const rows: any[] = [];
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const body = msg.slice(t + 1);
  const T = tokenStrings(body, enc).map(x => x.s);
  const L = T.length;
  // periodicity scan
  let best = { L: 0, frac: 0, n: 0 };
  for (let p = 2; p <= 240 && p < L; p++) {
    let hit = 0, cmp = 0;
    for (let i = 0; i + p < L; i++) { cmp++; if (T[i] === T[i + p]) hit++; }
    const frac = cmp ? hit / cmp : 0;
    if (frac > best.frac) best = { L: p, frac, n: Math.floor(L / p) };
  }
  // for the best period, count the anchors: positions where T[i]==T[i+p] (structural) vs not (data)
  const p = best.L;
  let anchor = 0, data = 0;
  if (p > 0) { for (let i = 0; i + p < L; i++) { if (T[i] === T[i + p]) anchor++; else data++; } }
  // exact `×` price model for one row-template rule + one list per varying column
  //   × rule  : key(1) + ×(1) + blank(1) + template + digits + list letters
  //   lists   : per varying column, key(1) + …(1) + sep(1) + items
  const nRows = best.n;
  const anchorsPerRow = p > 0 ? Math.round(anchor / nRows) : 0;
  const dataPerRow = p > 0 ? Math.round(data / nRows) : 0;
  // the template is the row's tokens with blanks at the data positions; its letters are the anchors
  const tplTokens = anchorsPerRow > 0 ? Math.max(1, Math.round(anchorsPerRow * 0.7)) : 0;
  const costX = 1 + 1 + 1 + tplTokens + 1 + dataPerRow;            // key, ×, blank, template, digits, list letters
  const costLists = dataPerRow * (1 + 1 + 1);                        // per column: key, …, sep
  const saving = nRows > 1 ? (nRows - 1) * anchorsPerRow : 0;
  const net = saving - costX - costLists;
  rows.push({ lane: f, bodyTokens: L, bestPeriod: p, periodFrac: best.frac, rows: nRows,
              anchorsPerRow, dataPerRow, costX, costLists, saving, net });
  console.log(`${f.padEnd(20)} body=${String(L).padStart(5)}  best period L=${String(p).padStart(3)} frac=${best.frac.toFixed(3)} rows=${String(nRows).padStart(3)} anchors/row=${String(anchorsPerRow).padStart(3)} data/row=${String(dataPerRow).padStart(3)}  saving=${String(saving).padStart(4)} cost=${String(costX + costLists).padStart(4)} NET=${String(net).padStart(5)}`);
}
const tot = rows.reduce((a, r) => a + Math.max(0, r.net), 0);
console.log(`\nΣΤΗΛΗ price model: pooled positive net = ${tot} tokens over the ten wires (7 844 tokens = ${(100 * tot / 7844).toFixed(2)}%)`);
fs.writeFileSync('bench/x100/receipts/style.json', JSON.stringify({ rows, pooledPositiveNet: tot }, null, 1));
