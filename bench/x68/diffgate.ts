import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const t = fs.readFileSync('bench/holdout-work/unified-diff.patch', 'utf8');
const lines = t.split('\n');
const out: string[] = [];
let i = 0;
while (i < lines.length) {
  const l = lines[i];
  if (l.startsWith('diff --git ')) {
    out.push(l); i++;
    if (lines[i]?.startsWith('index ')) { out.push(lines[i]); i++; }
    if (lines[i]?.startsWith('--- a/')) i++;
    if (lines[i]?.startsWith('+++ b/')) i++;
    continue;
  }
  const hm = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(l);
  if (hm) {
    const oA = +hm[1], nA = +hm[3], tail = hm[5] ?? '';
    const body: string[] = []; let j = i + 1;
    while (j < lines.length && /^[ +\-\\]/.test(lines[j])) { body.push(lines[j]); j++; }
    const ctx = body.filter(x => x.startsWith(' ')), del = body.filter(x => x.startsWith('-')), add = body.filter(x => x.startsWith('+'));
    out.push(`@@ ${oA} ${nA} ${ctx.length + del.length} ${ctx.length + add.length} @@${tail}`);
    out.push(...ctx.map(x => x.slice(1)), ...del.map(x => x.slice(1)), ...add.map(x => x.slice(1)));
    i = j; continue;
  }
  out.push(l); i++;
}
const tr = out.join('\n');
const r = tagstackEncode(tr, enc);
const min = Math.min(...Object.values(r.frontierCosts).map(Number));
console.log(JSON.stringify({ transformedRaw: countTokens(tr, enc), frontierOnTransformed: min, costs: r.frontierCosts, contractEstimate: 40, total: min + 40, sourceFrontier: 419, delta: min + 40 - 419 }));
