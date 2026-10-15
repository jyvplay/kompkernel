// z56: AKOLOUTHIA-2 vs plain DAEDALUS, one-chat M (contract + wire), o200k, exact.
import fs from 'node:fs';
import { akolouthia2Encode, akolouthia2Decode } from '@/lib/omega/akolouthia2';
import { daedalusEncode } from '@/lib/omega/daedalus';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = akolouthia2Encode(text, 'o200k_base');
  const exact = akolouthia2Decode(r.wire, r.arm) === text;
  console.log(JSON.stringify({ lane: f.split('/').pop(), raw: text.length, arm: r.arm, marks: r.marks, exact, akolouthia2: r.messageTokens, plain: daedalusEncode(text, 'o200k_base').messageTokens }));
}
