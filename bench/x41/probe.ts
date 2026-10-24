/**
 * X41 probe — ALIGNED (space-padded) RECORD SETS.
 *
 * Question: on the lanes this stack has never touched (kubectl, df -h, find
 * -printf, ls -l, psql borders), how much of the message is the PADDING, and
 * does splitting a line on a run of two-or-more spaces give a stable arity?
 *
 * Both are measured here on the raw text, before any codec:
 *   raw            tokens of the file
 *   single-space   tokens of the file with every >=2-space run replaced by one
 *                  space (this is the wire PINAX would write, modulo lifting)
 *   suffix-space   the same but the run is kept as ONE space at the END of the
 *                  field (right-aligned columns), counted to see if alignment
 *                  choice matters for the token count
 *   arity          the modal field count when a line is split on /\s{2,}/
 */
import * as fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';

const enc: any = 'o200k_base';
const lanes = (process.env.LANES || '').split(',').filter(Boolean);

for (const p of lanes) {
  if (!fs.existsSync(p)) continue;
  const t = fs.readFileSync(p, 'utf8');
  const rows = t.split('\n');
  const arity = new Map<number, number>();
  let spaceTokens = 0, maxRun = 0;
  for (const l of rows) {
    if (!l) continue;
    const parts = l.split(/ {2,}/);
    arity.set(parts.length, (arity.get(parts.length) || 0) + 1);
    for (const m of l.matchAll(/ {2,}/g)) {
      spaceTokens += countTokens(m[0], enc);
      maxRun = Math.max(maxRun, m[0].length);
    }
  }
  const flat = rows.map((l) => l.replace(/ {2,}/g, ' ')).join('\n');
  const rjust = rows.map((l) => l.replace(/ +(?!$)/g, (m) => ' '.repeat(m.length))).join('\n');
  const modal = [...arity.entries()].sort((a, b) => b[1] - a[1])[0];
  const consistent = rows.filter((l) => l && l.split(/ {2,}/).length === modal[0]).length;
  const nonBlank = rows.filter(Boolean).length;
  console.log(
    p.split('/').pop()!.padEnd(24),
    'raw=' + String(countTokens(t, enc)).padStart(5),
    'flat=' + String(countTokens(flat, enc)).padStart(5),
    'padTok=' + String(spaceTokens).padStart(4),
    'maxRun=' + String(maxRun).padStart(3),
    'rows=' + String(nonBlank).padStart(4),
    'modalArity=' + modal[0] + '(' + consistent + '/' + nonBlank + ')',
    'dist=' + [...arity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + ':' + v).join(' '),
  );
}
