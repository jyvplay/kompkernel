// X51 SYLLOGISMOS bench.
// mode parents <lane-file>: plan + measured parents on original and reduced (necessary-condition level).
// mode full <lane-file>: complete syllogismosEncode (includes TAGSTACK+SIBLING frontier when precheck passes).
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { syllogismosEncode, syllogismosPlan, syllogismosRestore } from '../../src/lib/omega/syllogismos';
const ENC = 'o200k_base' as const;
const T = (s: string) => countTokens(s, ENC);
const mode = process.argv[2]; const lanePath = process.argv[3]!;
const text = fs.readFileSync(lanePath, 'utf8');
const sha = crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const base = { lane: lanePath, sha256: sha, chars: text.length, rawTokens: T(text), encoding: ENC, node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null };
if (mode === 'parents') {
  const t0 = Date.now();
  const plan = syllogismosPlan(text, ENC);
  const out: any = { ...base, planMs: Date.now() - t0, plan: plan ? { drops: plan.spec.drops, est: plan.estColTokensDropped, reducedRawTokens: T(plan.reducedText), contractTok: T(plan.contract), roundTrip: syllogismosRestore(plan.reducedText, plan.spec) === text } : null };
  const P = (tx: string, tag: string) => {
    const all: Record<string, number> = {}; const ms: Record<string, number> = {};
    let s = Date.now(); const d = daedalusEncode(tx, ENC); ms.daedalus = Date.now() - s; if (!d.exact || d.decoded !== tx) throw new Error('dae'); all.daedalus = d.messageTokens;
    s = Date.now(); const a = akolouthia2Encode(tx, ENC); ms.ako2 = Date.now() - s; if (!a.exact || a.decoded !== tx) throw new Error('ako'); all.ako2 = countTokens(a.decoderPrompt, ENC);
    s = Date.now(); const g: any = apographeEncode(tx, ENC); ms.apographe = Date.now() - s; if (apographeDecodeResult(g) !== tx) throw new Error('apo'); all.apographe = T((g.contract ? g.contract + '\n' : '') + g.wire);
    console.log(JSON.stringify({ tag, all, ms }));
    return { all, ms, min: Math.min(...Object.values(all)), minMembers: Math.min(all.ako2!, all.apographe!) };
  };
  out.originalParents = P(text, 'orig');
  if (plan) {
    out.reducedParents = P(plan.reducedText, 'reduced');
    out.candidateTotal = out.reducedParents.min + T(plan.contract) + 1;
    out.deltaVsPrecheckMembers = out.candidateTotal - out.originalParents.minMembers;
    out.deltaVsAllThree = out.candidateTotal - out.originalParents.min;
    fs.mkdirSync('bench/x51/tmp-cross', { recursive: true });
    const nm = lanePath.split('/').pop()!.replace(/[^\w.-]/g, '_');
    fs.writeFileSync(`bench/x51/tmp-cross/lane-${nm}.orig`, text);
    fs.writeFileSync(`bench/x51/tmp-cross/lane-${nm}.reduced`, plan.reducedText);
    fs.writeFileSync(`bench/x51/tmp-cross/lane-${nm}.spec.json`, JSON.stringify(plan.spec));
    fs.writeFileSync(`bench/x51/tmp-cross/lane-${nm}.message.txt`, plan.contract + '\n' + plan.reducedText);
  }
  console.log(JSON.stringify(out, null, 2));
} else if (mode === 'full') {
  const t0 = Date.now();
  const r = syllogismosEncode(text, ENC);
  console.log(JSON.stringify({
    ...base, totalMs: Date.now() - t0,
    exact: r.exact && r.decoded === text, exactUtf8: Buffer.compare(Buffer.from(r.decoded, 'utf8'), Buffer.from(text, 'utf8')) === 0,
    applied: r.applied, messageTokens: r.messageTokens, parentTokens: r.parentTokens, parentCodec: r.parentCodec,
    parentCosts: r.parentCosts, precheckParentTokens: r.precheckParentTokens, fullFrontierMeasured: r.fullFrontierMeasured,
    candidateTokens: r.candidateTokens, candidateExact: r.candidateExact, candidateParentCodec: r.candidateParentCodec,
    candidateParentCosts: r.candidateParentCosts, drops: r.drops, dropDescriptions: r.dropDescriptions,
    comparison: r.comparison, notes: r.notes, ms: r.ms,
  }, null, 2));
} else throw new Error('mode must be parents|full');
