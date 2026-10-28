import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeDecodeResult, apographeEncode } from '../../src/lib/omega/apographe';
import { nestContractFor, nestTransformCandidates, nestRestore } from '../../src/lib/omega/nest';

const enc: any = 'o200k_base';
const path = process.argv[2] ?? 'bench/holdout-mk/page.html';
const baseline = process.argv[3] ? Number(process.argv[3]) : null;
const limit = process.argv[4] ? Number(process.argv[4]) : 16;
const text = fs.readFileSync(path, 'utf8');
const plans = nestTransformCandidates(text, enc, limit);
const candidates: any[] = [];
for (let i = 0; i < plans.length; i++) {
  const plan = plans[i];
  const contract = nestContractFor(plan.delimiters);
  const r = apographeEncode(plan.transformed, enc);
  const decoded = apographeDecodeResult(r);
  const parentMessage = `${r.contract ? r.contract + '\n' : ''}${r.wire}`;
  const complete = `${contract}\n${parentMessage}`;
  const messageTokens = countTokens(complete, enc);
  candidates.push({ index: i, element: plan.elementName, records: plan.records,
    slots: plan.slots, depth: plan.depth, proxyGain: plan.proxyGain, transformedTokens: countTokens(plan.transformed, enc),
    parentM: r.messageTokens, nestM: messageTokens,
    deltaToBaseline: baseline === null ? null : messageTokens - baseline,
    decodedTransformed: decoded === plan.transformed, exact: nestRestore(decoded, plan.delimiters) === text,
    parentReportedMatches: countTokens(parentMessage, enc) === r.messageTokens, parentNotes: r.notes });
}
console.log(JSON.stringify({ path, chars: text.length, sourceTokens: countTokens(text, enc), baseline,
  plans: plans.length, nestContractTokens: plans[0] ? countTokens(nestContractFor(plans[0].delimiters), enc) : null,
  candidates }, null, 2));
