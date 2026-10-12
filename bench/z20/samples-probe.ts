// P1 vs P2 on newly captured real ops outputs (bench/z20/samples/*.txt), o200k_base, decode-checked.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxEncode, phalanxDecode } from '@/lib/omega/phalanx';
import { phalanx2Encode, phalanx2Decode } from '@/lib/omega/phalanx2';
for (const f of fs.readdirSync('bench/z20/samples').filter(x => x.endsWith('.txt'))) {
  const t = fs.readFileSync(`bench/z20/samples/${f}`, 'utf8');
  const p1 = phalanxEncode(t, 'o200k_base'), p2 = phalanx2Encode(t, 'o200k_base');
  console.log([f, p1.inTokens, p1.outTokens, p2.outTokens, p2.mode, p2.koineKept ? 'kept' : 'off', `exact=${phalanxDecode(p1.wire) === t},${phalanx2Decode(p2.wire) === t}`, `${(100 * (p2.outTokens - p1.inTokens) / p1.inTokens).toFixed(1)}% vs identity`].join(' | '));
}
