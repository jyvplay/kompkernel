/**
 * THE RELATION-DENSITY SWEEP — the next highest-information test from the X74 report,
 * run against the frontier instead of guessed at.
 *
 * Question: is PROSPHYSIS a one-lane accident (one ls -l in the corpus) or a
 * mechanism with a population behind it? This counts, for every lane, the density of
 * the relation the codec exploits, and prices each lane against the frontier.
 */
import * as fs from 'node:fs';
import { countTokens as T } from '../../src/lib/omega/bpe';
import { prosphysisRewrite, PROSPHYSIS_KEY } from '../../src/lib/omega/prosphysis';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
const enc: any = 'o200k_base';
const prev = JSON.parse(fs.readFileSync('bench/x72/receipts/stadion-broad.json', 'utf8'));
const F = new Map<string, number>(prev.rows.map((r: any) => [r.path, r.tokens]));
const keyTok = T(PROSPHYSIS_KEY, enc);
const rows: any[] = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const lines = t.split('\n');
  // structural census over the whole lane, regardless of codec firing
  let arrows = 0, sibling = 0, charsAtStake = 0, nameChars = 0;
  for (const l of lines) {
    const m = /^(.* -> )([^\s]+)$/.exec(l);
    if (!m) continue;
    arrows++;
    const pre = m[1].replace(/ -> $/, '');
    const nm = /(\S+)$/.exec(pre.trim());
    const name = nm ? nm[1] : '';
    const tgt = m[2];
    if (name && tgt.length > name.length && tgt.startsWith(name)) { sibling++; charsAtStake += tgt.length - name.length; nameChars += name.length; }
  }
  const rw = prosphysisRewrite(t, ['suffix']);
  const base = F.get(p) ?? null;
  rows.push({ path: p, lines: lines.length, arrows, sibling, density: arrows ? sibling / arrows : 0, siblingChars: nameChars, frontier: base, rewritten: rw.rewritten,
    wireMinusKey: T(rw.wire, enc) });
  console.log(`${p.split('/').pop()!.padEnd(20)} lines ${String(lines.length).padStart(5)} arrows ${String(arrows).padStart(4)} sibling ${String(sibling).padStart(4)} density ${(arrows ? sibling / arrows : 0).toFixed(2)} sibChars ${String(nameChars).padStart(5)} frontier ${String(base).padStart(5)}`);
}
fs.writeFileSync('bench/x74/receipts/density.json', JSON.stringify({ keyTokens: keyTok, rows }, null, 1) + '\n');
console.log(`\nlane-level: ${rows.filter((r) => r.sibling > 0).length}/${rows.length} lanes contain at least one instance of the relation`);
