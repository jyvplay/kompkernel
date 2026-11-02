import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { kanonEncode } from '../../src/lib/omega/kanon';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { diastemaEncode } from '../../src/lib/omega/diastema';
import { metronPlan, metronEncode } from '../../src/lib/omega/metron';
const enc: any = 'o200k_base';
const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const raw = countTokens(t, enc);
  const out: any = { f, chars: t.length, raw };
  let t0 = Date.now();
  const s = synkrisisEncode(t, enc); out.synkrisis = countTokens(s.message, enc); out.synMs = Date.now() - t0; out.synOk = s.decoded === t;
  t0 = Date.now();
  const a = apographeEncode(t, enc); const aMsg = (a.contract ? a.contract + '\n' : '') + a.wire; out.apographe = countTokens(aMsg, enc); out.apMs = Date.now() - t0; out.apOk = apographeDecodeResult(a) === t;
  t0 = Date.now();
  const k = kanonEncode(t, enc); out.kanon = countTokens(k.decoderPrompt + k.wire, enc); out.kMs = Date.now()-t0;
  t0 = Date.now();
  const al = akolouthia2Encode(t, enc); out.akolouthia2 = countTokens(al.decoderPrompt, enc); out.ak2Ms = Date.now()-t0;
  console.log(JSON.stringify(out));
}
