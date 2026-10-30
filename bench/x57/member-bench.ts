// X57 SYZYGIA member bench: plan-parent (DAEDALUS/AKO2/APO) on reduced vs
// AKO2 + APO on source. No full frontier. Receipt to argv[3].
import * as fs from 'node:fs';
import { syzygiaPlan, syzygiaRestore } from '../../src/lib/omega/syzygia';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const [lane, out] = process.argv.slice(2) as [string, string];
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
const plan = syzygiaPlan(text, ENC);
if (!plan) { fs.writeFileSync(out, JSON.stringify({ lane, applied: false }, null, 1)); process.exit(0); }
const parents: Record<string, { tokens: number; decoded: string; ms: number }> = {};
const t1 = Date.now(); const dd = daedalusEncode(plan.reducedText, ENC);
parents.daedalus = { tokens: countTokens(dd.decoderPrompt, ENC), decoded: dd.decoded, ms: Date.now() - t1 };
const t2 = Date.now(); const ak = akolouthia2Encode(plan.reducedText, ENC);
parents.akolouthia2 = { tokens: countTokens(ak.decoderPrompt, ENC), decoded: ak.decoded, ms: Date.now() - t2 };
const t3 = Date.now(); const ap = apographeEncode(plan.reducedText, ENC);
const apMsg = ((ap as any).contract ? (ap as any).contract + '\n' : '') + ap.wire;
parents.apographe = { tokens: countTokens(apMsg, ENC), decoded: apographeDecodeResult(ap), ms: Date.now() - t3 };
const results = Object.entries(parents).map(([k, v]) => ({
  parent: k, candidate: countTokens(plan.contract + '\n', ENC) + v.tokens,
  exact: syzygiaRestore(v.decoded, plan.spec) === text, ms: v.ms,
})).sort((a, b) => a.candidate - b.candidate);
const t4 = Date.now(); const sak = akolouthia2Encode(text, ENC);
const srcAko = { tokens: countTokens(sak.decoderPrompt, ENC), exact: sak.decoded === text, ms: Date.now() - t4 };
const t5 = Date.now(); const sap = apographeEncode(text, ENC);
const sapMsg = ((sap as any).contract ? (sap as any).contract + '\n' : '') + sap.wire;
const srcApo = { tokens: countTokens(sapMsg, ENC), exact: apographeDecodeResult(sap) === text, ms: Date.now() - t5 };
fs.writeFileSync(out, JSON.stringify({
  lane, applied: true, planMs: t1 - t0,
  contractTokens: countTokens(plan.contract, ENC),
  drops: plan.spec.drops.map((d) => ({ tgt: d.col + 1, src: d.src + 1, name: d.headerName, exactFit: d.residuals === null })),
  candidateResults: results, srcAko2: srcAko, srcApographe: srcApo,
  totalMs: Date.now() - t0,
}, null, 1));
console.log('done', lane);
