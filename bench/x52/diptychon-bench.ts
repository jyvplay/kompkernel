// X52 DIPTYCHON bench. mode full <lane>: complete diptychonEncode.
// mode parent <name> <orig|reduced> <lane>: one parent measurement.
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { diptychonEncode, diptychonPlan, diptychonRestore } from '../../src/lib/omega/diptychon';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
const mode = process.argv[2]!;
if (mode === 'full') {
  const lane = process.argv[3]!;
  const text = fs.readFileSync(lane, 'utf8');
  const t0 = Date.now();
  const r = diptychonEncode(text, ENC);
  console.log(JSON.stringify({
    lane, sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
    chars: text.length, rawTokens: T(text), encoding: ENC, node: process.version,
    OMEGA_DET: process.env.OMEGA_DET ?? null, totalMs: Date.now() - t0,
    exact: r.exact && r.decoded === text, exactUtf8: Buffer.compare(Buffer.from(r.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0,
    applied: r.applied, messageTokens: r.messageTokens, parentTokens: r.parentTokens, parentCodec: r.parentCodec,
    parentCosts: r.parentCosts, precheckParentTokens: r.precheckParentTokens, fullFrontierMeasured: r.fullFrontierMeasured,
    candidateTokens: r.candidateTokens, candidateExact: r.candidateExact, candidateParentCodec: r.candidateParentCodec,
    candidateParentCosts: r.candidateParentCosts, format: r.format, compact: r.compact,
    dataLines: r.dataLines, totalBytes: r.totalBytes, comparison: r.comparison, notes: r.notes, ms: r.ms,
  }, null, 2));
} else if (mode === 'parent') {
  const [parent, which, lane] = process.argv.slice(3) as [string, string, string];
  const text = fs.readFileSync(lane, 'utf8');
  const plan = diptychonPlan(text, ENC); if (!plan) throw new Error('no plan');
  if (diptychonRestore(plan.reducedText, plan.spec) !== text) throw new Error('plan rt');
  fs.mkdirSync('bench/x52/tmp-cross', { recursive: true });
  const nm = lane.split('/').pop()!.replace(/[^\w.-]/g, '_');
  fs.writeFileSync(`bench/x52/tmp-cross/lane-${nm}.orig`, text);
  fs.writeFileSync(`bench/x52/tmp-cross/lane-${nm}.reduced`, plan.reducedText);
  fs.writeFileSync(`bench/x52/tmp-cross/lane-${nm}.spec.json`, JSON.stringify(plan.spec));
  fs.writeFileSync(`bench/x52/tmp-cross/lane-${nm}.message.txt`, plan.contract + '\n' + plan.reducedText);
  const tx = which === 'reduced' ? plan.reducedText : text;
  const t0 = Date.now(); let tokens: number;
  if (parent === 'daedalus') { const d = daedalusEncode(tx, ENC); if (!d.exact || d.decoded !== tx) throw new Error('dae'); tokens = d.messageTokens; }
  else if (parent === 'ako2') { const a = akolouthia2Encode(tx, ENC); if (!a.exact || a.decoded !== tx) throw new Error('ako'); tokens = T(a.decoderPrompt); }
  else if (parent === 'apographe') { const g: any = apographeEncode(tx, ENC); if (apographeDecodeResult(g) !== tx) throw new Error('apo'); tokens = T((g.contract ? g.contract + '\n' : '') + g.wire); }
  else throw new Error('parent?');
  console.log(JSON.stringify({ lane, parent, which, tokens, ms: Date.now() - t0, contractTok: T(plan.contract), rawTok: T(text), reducedRawTok: T(plan.reducedText), format: plan.spec.format, compact: plan.spec.compact }));
} else throw new Error('mode?');
