// Diagnostic: the first row whose canonical render differs from the original, for the first N data rows of a block.
import fs from 'node:fs';
import { tokensOf, renderRow } from '@/lib/omega/padtab';
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => l.length > 0);
const k = Number(process.argv[3]);
const block = lines.filter((l) => tokensOf(l).length === k).slice(1);
const rows = block.map(tokensOf);
const mode = (xs: number[]) => { const c = new Map<number, number>(); for (const x of xs) c.set(x, (c.get(x) ?? 0) + 1); let b = xs[0], n = -1; for (const [x, m] of c) if (m > n) { b = x; n = m; } return b; };
const cols = [] as { a: 'L' | 'R'; p: number }[];
for (let j = 0; j < k; j++) { const s = rows.map((r) => r[j].s); cols.push(s.every((x) => x === s[0]) ? { a: 'L', p: s[0] } : { a: 'R', p: mode(rows.map((r) => r[j].e)) }); }
console.log('spec', cols.map((c) => c.a + c.p).join(','));
let shown = 0;
rows.forEach((r, i) => { const R = renderRow(r.map((x) => x.t), cols); if (R !== block[i] && shown < 2) { shown++; console.log('ORIG', JSON.stringify(block[i])); console.log('REND', JSON.stringify(R)); } });
