// X55 KEPHALAION member benches (segmented, one parent per process).
// Usage: node /tmp/x55-bench.mjs <lane> <member>
// lanes: ethiopia150 | statewise
// members: candidate | daedalus | akolouthia2 | apographe
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { kephalaionPlan } from '../../src/lib/omega/kephalaion';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);

const full = fs.readFileSync('bench/x55/fixtures/ethiopia-covid-regions.csv', 'utf8');
const eol = full.includes('\r\n') ? '\r\n' : '\n';
const parts = full.split(eol);
const lanes: Record<string, string> = {
  ethiopia150: parts.slice(0, 151).join(eol) + eol,
  ethiopiaMid: [parts[0]!, ...parts.slice(300, 450)].join(eol) + eol,
  ethiopiaFull: full,
  statewise: fs.readFileSync('bench/x55/fixtures/state_wise.csv', 'utf8'),
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
  const p = kephalaionPlan(text, ENC);
  if (!p) { console.log(JSON.stringify({ lane, member, plan: false })); process.exit(0); }
  const parent = member.slice(5);
  const r = payload(parent, p.reducedText);
  const planDesc = p.spec.rowsum ? `rowsum col${p.spec.rowsum.col + 1} terms${p.spec.rowsum.terms.length} exc${p.spec.rowsum.exceptions.length}` : `colsum${p.spec.colsum ? ' row' + (p.spec.colsum.row + 1) : ''}`;
  console.log(JSON.stringify({ lane, member, plan: planDesc, contract: T(p.contract), reduced: r.tokens, reducedExact: r.exact, candidate: T(p.contract) + r.tokens, raw: T(text), chars: text.length, ms: Date.now() - t0 }));
} else {
  const r = payload(member, text);
  console.log(JSON.stringify({ lane, member, tokens: r.tokens, exact: r.exact, raw: T(text), ms: Date.now() - t0 }));
}
