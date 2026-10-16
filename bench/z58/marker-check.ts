// X13: candidate HORA markers. Must be 1 o200k token, absent from CHIRON/DAEDALUS sources and from the lanes.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const srcs = ['src/lib/omega/chiron.ts', 'src/lib/omega/daedalus.ts', 'src/lib/omega/ariadne.ts', 'src/lib/omega/sibyl.ts'].map(f => fs.readFileSync(f, 'utf8'));
const lane = fs.readFileSync('bench/holdout-ops/openstack-loghub-26.log', 'utf8');
for (const c of ['§', '‡', '¤', '⌖', '⏲', 'ʇ', '⊕', '※', '⇢', '⧖']) {
  const inSrc = srcs.some(s => s.includes(c));
  const inLane = lane.includes(c);
  console.log(JSON.stringify({ c, tokens: countTokens(c, 'o200k_base'), tokensAfterSpace: countTokens(' ' + c + '264', 'o200k_base'), inChironDaedalus: inSrc, inOpenstack: inLane }));
}
