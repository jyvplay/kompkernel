// X56 ISOSKELES member benches (segmented, one parent per process).
// Usage: node /tmp/x56-bench.mjs <lane> <member>
// lanes: us31 | eu24 | corr14 | goal3 ; members: cand-<p> | daedalus | akolouthia2 | apographe
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { isoskelesPlan } from '../../src/lib/omega/isoskeles';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
const lanes: Record<string, string> = {
  us31: fs.readFileSync('bench/x56/fixtures/us-cities-distance-matrix.csv', 'utf8'),
  eu24: fs.readFileSync('bench/x56/fixtures/eu-cities-distance-matrix.csv', 'utf8'),
  corr14: fs.readFileSync('bench/x56/fixtures/ethiopia-regions-corr-matrix.csv', 'utf8'),
  goal3: fs.readFileSync('bench/x56/fixtures/goal3-corr-matrix.csv', 'utf8'),
};
const lane = process.argv[2]!;
const member = process.argv[3]!;
const text = lanes[lane];
if (!text) throw new Error('unknown lane ' + lane);
const payload = (m: string, s: string): { tokens: number; exact: boolean } => {
  if (m === 'daedalus') { const r = daedalusEncode(s, ENC); return { tokens: r.messageTokens, exact: r.exact && r.decoded === s }; }
  if (m === 'akolouthia2') { const r = akolouthia2Encode(s, ENC); return { tokens: T(r.decoderPrompt), exact: r.exact && r.decoded === s }; }
  if (m === 'apographe') { const r: any = apographeEncode(s, ENC); return { tokens: T((r.contract ? r.contract + '\n' : '') + r.wire), exact: apographeDecodeResult(r) === s }; }
  throw new Error('member ' + m);
};
const t0 = Date.now();
if (member.startsWith('cand-')) {
  const p = isoskelesPlan(text, ENC);
  if (!p) { console.log(JSON.stringify({ lane, member, plan: false })); process.exit(0); }
  const parent = member.slice(5);
  const r = payload(parent, p.reducedText);
  console.log(JSON.stringify({ lane, member, plan: `n${p.spec.n} hdr${p.spec.header} lab${p.spec.labelCols} pad${p.spec.trailingPad} diag=${p.spec.diagConst} exc${p.spec.exceptionPairs}`, contract: T(p.contract), reduced: r.tokens, reducedExact: r.exact, candidate: T(p.contract) + r.tokens, raw: T(text), chars: text.length, ms: Date.now() - t0 }));
} else {
  const r = payload(member, text);
  console.log(JSON.stringify({ lane, member, tokens: r.tokens, exact: r.exact, raw: T(text), ms: Date.now() - t0 }));
}
