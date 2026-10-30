// Accepts an external OpenPowerlifting raw CSV path (not vendored here because
// the public mirror is AGPL-3.0 licensed). Runs EIRMOS + exact member parents.
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { eirmosPlan, eirmosRestore } from '../../src/lib/omega/eirmos';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const path = process.argv[2]!;
const text = fs.readFileSync(path, 'utf8');
const plan = eirmosPlan(text, ENC);
const out: any = { sha256: createHash('sha256').update(text).digest('hex'), codeUnits: text.length,
  sourceTokens: countTokens(text, ENC), applied: !!plan, exactPlan: plan ? eirmosRestore(plan.reducedText, plan.spec) === text : null,
  clauseTokens: plan ? countTokens(plan.contract, ENC) : null,
  drops: plan?.spec.drops.map((d) => ({ name: d.name, exceptions: d.exceptions.length, parts: d.parts })) ?? [], parents: [] };
if (plan) {
  fs.writeFileSync('/tmp/openpowerlifting.contract.txt', plan.contract);
  fs.writeFileSync('/tmp/openpowerlifting.reduced.csv', plan.reducedText);
  for (const [name, encode] of [['akolouthia2', akolouthia2Encode], ['daedalus', daedalusEncode]] as const) {
    let t = Date.now(); const source: any = (encode as any)(text, ENC);
    out.parents.push({ name, side: 'source', tokens: source.messageTokens, exact: source.exact && source.decoded === text, ms: Date.now() - t });
    t = Date.now(); const reduced: any = (encode as any)(plan.reducedText, ENC);
    out.parents.push({ name, side: 'candidate', tokens: countTokens(plan.contract, ENC) + 1 + reduced.messageTokens,
      parentMessageTokens: reduced.messageTokens, exact: reduced.exact && reduced.decoded === plan.reducedText, ms: Date.now() - t });
  }
}
console.log(JSON.stringify(out, null, 1));
