// z55: AKOLOUTHIA vs plain DAEDALUS, one-chat M (contract + wire), o200k, exact. usage: run.sh bench/z55/akolouthia-bench.ts <files>
import fs from 'node:fs';
import { akolouthiaEncode, akolouthiaDecode } from '@/lib/omega/akolouthia';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = akolouthiaEncode(text, 'o200k_base');
  const exact = akolouthiaDecode(r.wire, r.arm) === text;
  console.log(JSON.stringify({ lane: f.split('/').pop(), raw: text.length, arm: r.arm, marks: r.marks, exact, akolouthia: r.messageTokens, daedalus: r.daedalus.messageTokens, delta: r.messageTokens - r.daedalus.messageTokens }));
}
