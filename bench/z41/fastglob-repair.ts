// Z41: fast-glob README under DAEDALUS-D: default (blocks on) vs noBlocks. Reports mode, exactness and tokens.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
const t = fs.readFileSync(process.argv[2], 'utf8');
for (const nb of [false, true]) {
  const r = daedalusEncode(t, 'o200k_base', { dualTokenizer: true, noBlocks: nb });
  const ok = r.mode === 'daedalus' && r.decoded === t;
  console.log(JSON.stringify({ noBlocks: nb, mode: r.mode, exact: ok, arm: r.winningArm, o: r.messageTokens, c: r.mode === 'daedalus' ? countTokens(r.decoderPrompt, 'cl100k_base') : countTokens(t, 'cl100k_base'), inO: countTokens(t, 'o200k_base'), inC: countTokens(t, 'cl100k_base'), decodedLen: r.decoded.length, inLen: t.length }));
}
