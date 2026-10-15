// z56: ONOMASIA vs plain DAEDALUS, one-chat M (contract + wire), o200k, exact. usage: run.sh bench/z56/onomasia-bench.ts <files>
import fs from 'node:fs';
import { onomasiaEncode, onomasiaDecode } from '@/lib/omega/onomasia';
import { daedalusEncode } from '@/lib/omega/daedalus';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = onomasiaEncode(text, 'o200k_base');
  const exact = onomasiaDecode(r.wire, r.arm) === text;
  console.log(JSON.stringify({ lane: f.split('/').pop(), raw: text.length, arm: r.arm, marks: r.marks, exact, onomasia: r.messageTokens, plain: daedalusEncode(text, 'o200k_base').messageTokens, notes: r.notes }));
}
