// Exact SYZYGIA member candidate: plan + AKOLOUTHIA-2 (and DAEDALUS) on
// reduced, fused token count of contract + LF + parent message; APO legs
// are NOT measured here (see X57.md disclosure if they timed out).
import * as fs from 'node:fs';
import { syzygiaPlan, syzygiaRestore } from '../../src/lib/omega/syzygia';
import { akolouthia2Encode } from '../../src/lib/omega/akolouthia2';
import { daedalusEncode } from '../../src/lib/omega/daedalus';
import { countTokens } from '../../src/lib/omega/bpe';
const ENC = 'o200k_base' as const;
const lane = process.argv[2]!;
const text = fs.readFileSync(lane, 'utf8');
const t0 = Date.now();
const plan = syzygiaPlan(text, ENC)!;
const ako = akolouthia2Encode(plan.reducedText, ENC);
const dae = daedalusEncode(plan.reducedText, ENC);
const candAko = countTokens(plan.contract + '\n' + ako.decoderPrompt, ENC);
const candDae = countTokens(plan.contract + '\n' + dae.decoderPrompt, ENC);
console.log(JSON.stringify({
  lane, contractTokens: countTokens(plan.contract, ENC),
  candidateViaAkolouthia2: candAko, exactAko: syzygiaRestore(ako.decoded, plan.spec) === text,
  candidateViaDaedalus: candDae, exactDae: syzygiaRestore(dae.decoded, plan.spec) === text,
  drops: plan.spec.drops.map((d) => ({ name: d.headerName, tgt: d.col + 1, src: d.src + 1, exactFit: d.residuals === null })),
  ms: Date.now() - t0,
}, null, 1));
