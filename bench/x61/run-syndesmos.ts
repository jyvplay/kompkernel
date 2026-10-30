import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { syndesmosEncode, syndesmosPlan, syndesmosExpand } from '../../src/lib/omega/syndesmos';
import { countTokens } from '../../src/lib/omega/bpe';

const path = process.argv[2] ?? 'bench/z47/corpus/changelog/ucfopen_canvasapi.md';
const text = fs.readFileSync(path, 'utf8');
const plan = syndesmosPlan(text);
if (!plan) throw new Error('No candidate plan found');
if (syndesmosExpand(plan.transformed, plan.urls) !== text) throw new Error('Plan restore mismatch');
const t0 = Date.now();
const result = syndesmosEncode(text, 'o200k_base');
const receipt = {
  config: { path, encoding: 'o200k_base', node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null,
    cost: 'complete in-band message, direct o200k_base count; candidate = optional in-band URL-prefix table + URL-reference contract + transformed TAGSTACK runtime-parent frontier + SIBLING-TEMPLATE; baseline = same-source frontier' },
  input: { sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'), chars: text.length, tokens: countTokens(text, 'o200k_base') },
  plan: { prefix: plan.prefix, linkCount: plan.linkCount, eligibleLinks: plan.eligibleLinks, urls: plan.urls.length,
    transformedTokens: countTokens(plan.transformed, 'o200k_base'), transformedChars: plan.transformed.length,
    contractTokens: countTokens(plan.contract, 'o200k_base'), exactPlan: syndesmosExpand(plan.transformed, plan.urls) === text },
  result: { applied: result.applied, exact: result.exact, messageTokens: result.messageTokens,
    sourceFrontierTokens: result.frontierTokens, parentCodec: result.parentCodec,
    fullFrontierMeasured: result.fullFrontierMeasured, comparison: result.comparison,
    planMs: result.planMs, elapsedMs: Date.now() - t0 },
};
fs.mkdirSync('bench/x61/receipts', { recursive: true });
fs.writeFileSync('bench/x61/receipts/syndesmos-' + path.split('/').at(-1) + '.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!result.exact || !result.fullFrontierMeasured || (result.applied && result.messageTokens >= result.frontierTokens)) process.exitCode = 1;
