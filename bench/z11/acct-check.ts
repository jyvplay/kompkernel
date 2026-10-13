import fs from 'node:fs';
import { hyleEncode, hyleContractFor } from '@/lib/omega/hyle';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { countTokens } from '@/lib/omega/bpe';
const T = (s: string) => countTokens(s, 'o200k_base');
for (const f of (process.env.LIST || '').split(',').filter(Boolean)) {
  const t = fs.readFileSync(f, 'utf8');
  const h = hyleEncode(t, 'o200k_base', { fast: true });
  const nl = h.wire.indexOf('\n'); const dirs = h.wire.slice(1, nl).split(';').filter(d => d[0] !== 'B');
  const body = h.wire.slice(nl + 1);
  const d = daedalusEncode(body, 'o200k_base');
  console.log(JSON.stringify({ f: f.split('/').pop(), bodyTok: T(body), daeOut: d.outTokens, daeMsg: d.messageTokens, daePromptTok: T(d.decoderPrompt), daeMode: d.mode, hyleContractTok: T(hyleContractFor(dirs)), raw: T(t) }));
}
