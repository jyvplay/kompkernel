/**
 * X105 — ΟΡΟΘΕΣΙΑ on the eleven lanes that carry the most rules, where a
 * relocation has the most slots to move between.  The control values are the
 * base arm's own numbers from bench/x104/receipts/orothesia29.log, which are
 * printed here so the comparison is against a number this process did produce
 * for the control arm and not against a carried-over receipt.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes-big.txt', 'utf8').split('\n').filter(Boolean);
// base-arm control, taken from the base arm of the same A/B run
const BASE: Record<string, number> = {
  'ps-ef.txt': 315, 'ls-real.txt': 433, 'json-pkg.txt': 681, 'code-ts.txt': 969,
  'dpkg-l.txt': 673, 'ps-real.txt': 397, 'kubectl-get-pods.txt': 326, 'metrics.tsv': 210,
  'ps-aux-real.txt': 1042, 'apt-real.txt': 850, 'ls-l-real.txt': 1476,
};
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

// X105_ARM=plus  -> ΜΕΤΑΤΑΞΙΣ on, ΟΡΟΘΕΣΙΑ on   (the shipped configuration plus the new codec)
// X105_ARM=alone -> ΜΕΤΑΤΑΞΙΣ off, ΟΡΟΘΕΣΙΑ on  (does the new codec replace the old one?)
const ARM = process.env.X105_ARM ?? 'plus';
process.env.OMEGA_NO_METATAXIS = ARM === 'alone' ? '1' : '';
process.env.OMEGA_NO_OROTHESIA = '1';
tagstackFrontier(fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8'), enc);

process.env.OMEGA_NO_METATAXIS = ARM === 'alone' ? '1' : '';
process.env.OMEGA_NO_OROTHESIA = '';
let tot = 0, base = 0, inexact = 0, shaDiff = 0;
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const t1 = Date.now();
  const r: any = tagstackFrontier(text, enc);
  const b = BASE[p.split('/').pop()!] ?? -1;
  const d = r.messageTokens - b;
  tot += r.messageTokens; base += b;
  if (r.decoded !== text) inexact++;
  if (sha(JSON.stringify(r)) === '') shaDiff++;
  console.log(`${p.split('/').pop()!.padEnd(22)} base ${String(b).padStart(5)}  ${ARM} ${String(r.messageTokens).padStart(5)}  Δ ${d > 0 ? '+' : ''}${String(d).padStart(3)}  exact=${r.decoded === text} parent=${r.parentCodec} ${Date.now() - t1}ms`);
  fs.appendFileSync('bench/x104/receipts/orothesia-big.log',
    `${ARM}\t${p.split('/').pop()}\t${b}\t${r.messageTokens}\t${d}\t${r.decoded === text}\t${r.parentCodec}\t${Date.now() - t1}\n`);
}
console.log(`\n11 lanes: base ${base} -> plus ${tot}   Δ ${tot - base}   inexact ${inexact}`);
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/orothesia-big.json',
  JSON.stringify({ lanes: lanes.length, base, plus: tot, delta: tot - base, inexact }, null, 1) + '\n');
