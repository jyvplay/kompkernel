// Diagnostic + check: PADTAB2 accepted lines per real ops file, and exact round trip of padEncode2/padDecode2 on each file.
import fs from 'node:fs';
import path from 'node:path';
import { padEncode2, padDecode2, padPickMark2 } from '@/lib/omega/padtab2';
import { padEncode, padPickMark } from '@/lib/omega/padtab';
let bad = 0;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const m2 = padPickMark2(t)!;
  const out2 = padEncode2(t, m2);
  const back = padDecode2(out2, m2) === t;
  if (!back) bad++;
  const blockLines = out2.split('\n').filter((l) => l.startsWith(m2 + 'T ')).length;

  const m1 = padPickMark(t)!;
  const v1 = padEncode(t, m1).split('\n').filter((l) => l.startsWith(m1 + 'T ')).length;
  console.log(`${path.basename(f)}: PADTAB blocks=${v1} PADTAB2 blocks=${blockLines} exact=${back}`);
}
console.log(`round-trip failures: ${bad}`);
