// Diagnostic: how many lines of each real ops file are in blocks that the encoder accepts, and why others are rejected.
import fs from 'node:fs';
import path from 'node:path';
import { padEncode, padPickMark } from '@/lib/omega/padtab';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const mark = padPickMark(t)!;
  const out = padEncode(t, mark);
  const changedLines = out.split('\n').filter((l) => l.startsWith(mark + 'T ')).length;
  const lines = t.split('\n');
  const counts: Record<number, number> = {};
  for (const l of lines) { const k = l.split(' ').filter((x) => x.length > 0).length; counts[k] = (counts[k] || 0) + 1; }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, c]) => `k${k}:${c}`).join(' ');
  console.log(`${path.basename(f)}: accepted blocks=${changedLines} bytes-changed=${out !== t} top token-counts ${top}`);
}
