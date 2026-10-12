// Z32: dump VERITAS-C wires and originals as JSON lines, for the independent legend-only reader (Python).
import fs from 'node:fs';
import { veritasCEncode } from '@/lib/omega/veritas-c';
const files = fs.readFileSync('/home/user/z31/fresh-list.tsv', 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t')[1]);
const pick = files.filter((_, i) => i % 4 === 0).slice(0, 28).concat(['/home/user/kompkernel/bench/holdout/readme.txt', '/home/user/kompkernel/bench/holdout/code-ts.txt']);
const out: string[] = [];
let n = 0;
for (const f of pick) {
  const t = fs.readFileSync(f.startsWith('/') ? f : '/home/user/kompkernel/' + f, 'utf8');
  const r = veritasCEncode(t, 'o200k_base');
  if (r.mode !== 'dict') continue;
  n++;
  out.push(JSON.stringify({ file: f, wire: r.wire, original: t, nested: r.entries.some((e) => [...r.entries].some((q) => q.phrase !== e.phrase && e.phrase.includes(q.phrase))) }));
}
fs.writeFileSync('/home/user/kompkernel/bench/z32/legend-reader/vxc-samples.jsonl', out.join('\n') + '\n');
console.log('dict wires written', n);
