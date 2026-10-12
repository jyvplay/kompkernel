// Potential of a canonical-JSON layer: if text === JSON.stringify(JSON.parse(text), null, 2) + maybe newline,
// the wire can carry the minified JSON and the decoder re-expands it. Measures A2 on pretty vs minified.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { phalanxA2Encode, phalanxA2Decode } from '@/lib/omega/phalanx-a2';
const enc = 'o200k_base' as const;
const f = process.argv[2] ?? 'bench/holdout/json-pkg.txt';
const pretty = fs.readFileSync(f, 'utf8');
const val = JSON.parse(pretty);
const mini = JSON.stringify(val);
const canonNL = JSON.stringify(val, null, 2);
const isCanon = pretty === canonNL || pretty === canonNL + '\n';
const a2p = phalanxA2Encode(pretty, enc);
const a2m = phalanxA2Encode(mini, enc);
console.log(`${f}: canonical=${isCanon} identity=${countTokens(pretty, enc)} A2(pretty)=${a2p.outTokens} minified=${countTokens(mini, enc)} A2(minified)=${a2m.outTokens} ` +
  `(A2 minified - A2 pretty = ${a2m.outTokens - a2p.outTokens}, ${(((a2m.outTokens - a2p.outTokens) / a2p.outTokens) * 100).toFixed(1)}%)`);
console.log(`round trip A2(minified) exact: ${phalanxA2Decode(a2m.wire) === mini}`);
