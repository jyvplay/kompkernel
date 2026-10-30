// One named parent leg on a file, own receipt. Usage:
//   node leg.mjs <daedalus|akolouthia2|apographe|syzygiaPlanOnly> <file> <out.json>
import * as fs from 'node:fs';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { syzygiaPlan, syzygiaRestore } from '../../src/lib/omega/syzygia';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const [codec, file, out] = process.argv.slice(2) as [string, string, string];
const text = fs.readFileSync(file, 'utf8');
const t0 = Date.now();
let res: Record<string, unknown> = { codec, file };
if (codec === 'daedalus') {
  const r = daedalusEncode(text, ENC);
  res = { ...res, tokens: countTokens(r.decoderPrompt, ENC), exact: r.decoded === text };
} else if (codec === 'akolouthia2') {
  const r = akolouthia2Encode(text, ENC);
  res = { ...res, tokens: countTokens(r.decoderPrompt, ENC), exact: r.decoded === text };
} else if (codec === 'apographe') {
  const r = apographeEncode(text, ENC);
  const msg = ((r as any).contract ? (r as any).contract + '\n' : '') + r.wire;
  res = { ...res, tokens: countTokens(msg, ENC), exact: apographeDecodeResult(r) === text };
} else if (codec === 'syzygiaPlanOnly') {
  const plan = syzygiaPlan(text, ENC);
  if (plan) {
    fs.writeFileSync('/tmp/syz-reduced.csv', plan.reducedText);
    fs.writeFileSync('/tmp/syz-contract.txt', plan.contract);
    res = { ...res, applied: true, exact: syzygiaRestore(plan.reducedText, plan.spec) === text, contractTokens: countTokens(plan.contract, ENC), drops: plan.spec.drops.length };
  } else res = { ...res, applied: false };
} else throw new Error(codec);
res.ms = Date.now() - t0;
fs.writeFileSync(out, JSON.stringify(res, null, 1));
console.log(JSON.stringify(res));
