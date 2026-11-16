/** X123 upper-bound probe for the padding mechanism (ΠΛΑΤΟΣ).
 *
 * For every lane with a measurable whitespace-padding mass, price the lane and a
 * WHITESPACE-COLLAPSED variant (`' '.join(line.split())` on the record lines).
 * The collapsed text is NOT invertible in general, so this is an UPPER BOUND on
 * what a padding side-stream could ever be worth, not a shippable codec. If the
 * bound is small the mechanism is dead; if it is large the side-stream is worth
 * building. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier, tagstackMemoClear } from '../../src/lib/omega/tagstack';

const enc = 'o200k_base' as const;
const LANES = [
  'bench/holdout-x42/dpkg-l.txt',
  'bench/holdout-x41/ps-aux-real.txt',
  'bench/holdout-x42/findmnt.txt',
  'bench/holdout-x42/ps-ef.txt',
  'bench/holdout-x41/ps-real.txt',
  'bench/holdout-x41/node-help.txt',
  'bench/holdout-tbl/kubectl-get-pods.txt',
  'bench/holdout-x41/ls-real.txt',
  'bench/holdout-tbl/df-h.txt',
];

const out: any[] = [];
let so = 0, sc = 0;
for (const p of LANES) {
  const text = fs.readFileSync(p, 'utf8');
  const e = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(e);
  const idx = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.trim() && !l.startsWith('#') && l.split(/\s+/).length >= 3)
    .map(({ i }) => i);
  const collapsed = lines.slice();
  let pad = 0;
  for (const i of idx) {
    const c = lines[i].split(/\s+/).join(' ');
    pad += lines[i].length - c.length;
    collapsed[i] = c;
  }
  const text2 = collapsed.join(e);
  tagstackMemoClear();
  const a = tagstackFrontier(text, enc);
  tagstackMemoClear();
  const b = tagstackFrontier(text2, enc);
  const row = { lane: p.split('/').pop(), padChars: pad, orig: a.messageTokens, col: b.messageTokens,
    delta: b.messageTokens - a.messageTokens, exact: a.decoded === text && b.decoded === text2 };
  out.push(row);
  so += row.orig; sc += row.col;
  console.log(`${row.lane!.padEnd(24)} pad ${String(row.padChars).padStart(5)}  orig ${String(row.orig).padStart(5)}` +
    `  collapsed ${String(row.col).padStart(5)}  Δ ${String(row.delta).padStart(5)}  exact ${row.exact}`);
  fs.writeFileSync('bench/x123/receipts/collapse-probe.json', JSON.stringify(out, null, 1) + '\n');
}
console.log(`\nΣ orig ${so}  collapsed ${sc}  Δ ${sc - so}`);
