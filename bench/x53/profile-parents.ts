// X53 (X52 task 5): profile each TAGSTACK runtime parent separately on the hex
// lane od-bin512 to find which one is pathological on hex text. One parent per
// invocation: usage: node profile-parents.mjs <parent>
import * as fs from 'node:fs';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { bifrontEncode } from '../../src/lib/omega/bifront';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { diastemaEncode } from '../../src/lib/omega/diastema';
import { metronEncode } from '../../src/lib/omega/metron';
import { hemeraEncode } from '../../src/lib/omega/hemera';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const lane = process.argv[3] ?? 'bench/x52/fixtures/od-bin512.txt';
const text = fs.readFileSync(lane, 'utf8');
const name = process.argv[2]!;
const t0 = Date.now();
let out: Record<string, unknown> = { parent: name, lane, chars: text.length };
try {
  if (name === 'synkrisis') { const r: any = synkrisisEncode(text, ENC); out.exact = r.decoded === text; out.tokens = r.messageTokens ?? (r.decoderPrompt ? countTokens(r.decoderPrompt, ENC) : null); }
  else if (name === 'bifront') { const r: any = bifrontEncode(text, ENC); out.exact = r.decoded === text; out.tokens = r.messageTokens ?? null; out.applied = r.applied; }
  else if (name === 'kanon') { const r: any = kanonEncode(text, ENC); out.exact = r.decoded === text; out.tokens = r.messageTokens ?? (r.decoderPrompt ? countTokens(r.decoderPrompt, ENC) : null); }
  else if (name === 'akolouthia2') { const r: any = akolouthia2Encode(text, ENC); out.exact = r.exact && r.decoded === text; out.tokens = countTokens(r.decoderPrompt, ENC); }
  else if (name === 'apographe') { const r: any = apographeEncode(text, ENC); out.exact = apographeDecodeResult(r) === text; out.tokens = countTokens(((r.contract ? r.contract + '\n' : '') + r.wire), ENC); }
  else if (name === 'diastema') { const r: any = diastemaEncode(text, ENC); out.exact = r.decoded === text; out.tokens = r.messageTokens ?? (r.decoderPrompt ? countTokens(r.decoderPrompt, ENC) : null); }
  else if (name === 'metron') { const r: any = metronEncode(text, ENC); out.exact = r.decoded === text; out.tokens = r.messageTokens ?? null; out.applied = r.applied; }
  else if (name === 'hemera') { const r: any = hemeraEncode(text, ENC); out.exact = r.decoded === text; out.tokens = r.messageTokens ?? null; out.applied = r.applied; }
  else if (name === 'daedalus') { const r: any = daedalusEncode(text, ENC); out.exact = r.exact && r.decoded === text; out.tokens = r.messageTokens; }
  else throw new Error('unknown parent');
} catch (e) { out.error = String(e); }
out.ms = Date.now() - t0;
console.log(JSON.stringify(out));
