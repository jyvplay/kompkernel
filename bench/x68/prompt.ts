import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { diastemaEncode } from '../../src/lib/omega/diastema';
import { metronEncode } from '../../src/lib/omega/metron';
const enc: any = 'o200k_base';
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const a: any = akolouthia2Encode(t, enc);
  const k: any = kanonEncode(t, enc);
  const s: any = synkrisisEncode(t, enc);
  console.log(JSON.stringify({ f, raw: countTokens(t, enc),
    ak: { prompt: countTokens(a.decoderPrompt, enc), total: countTokens(a.decoderPrompt, enc) },
    akPrompt: a.decoderPrompt.slice(0, 400),
  }));
}
