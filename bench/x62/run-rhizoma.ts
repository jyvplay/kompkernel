import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { rhizomaEncode, rhizomaPlan, rhizomaExpand, RHIZOMA_CONTRACT } from '../../src/lib/omega/rhizoma';

const path = process.argv[2] ?? 'bench/z55/lanes/tree-src.txt';
const text = fs.readFileSync(path, 'utf8');
const transformed = rhizomaPlan(text);
if (!transformed || rhizomaExpand(transformed) !== text) throw new Error('RHIZOMA plan failed exact precheck');
const started = Date.now();
const result = rhizomaEncode(text, 'o200k_base');
const receipt = {
  config: {
    path, encoding: 'o200k_base', node: process.version, OMEGA_DET: process.env.OMEGA_DET ?? null,
    cost: 'complete in-band RHIZOMA contract + transformed text encoded by TAGSTACK runtime parents + SIBLING-TEMPLATE, against the complete same-source frontier',
    scope: 'TAGSTACK runtime-parent frontier plus SIBLING-TEMPLATE; not a registry-wide tournament',
  },
  input: { sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'), chars: text.length,
    tokens: countTokens(text, 'o200k_base'), nbsp: [...text].filter((c) => c === '\u00a0').length },
  plan: { transformedChars: transformed.length, transformedTokens: countTokens(transformed, 'o200k_base'),
    contract: RHIZOMA_CONTRACT, contractTokens: countTokens(RHIZOMA_CONTRACT, 'o200k_base'),
    removedNBSP: text.length - transformed.length, exact: rhizomaExpand(transformed) === text },
  result: { applied: result.applied, exact: result.exact, messageTokens: result.messageTokens,
    sourceFrontierTokens: result.frontierTokens, parentCodec: result.parentCodec,
    fullFrontierMeasured: result.fullFrontierMeasured, comparison: result.comparison,
    planMs: result.planMs, elapsedMs: Date.now() - started },
};
fs.mkdirSync('bench/x62/receipts', { recursive: true });
const laneSlug = path.split('/').at(-1)!.replace(/\.txt$/u, '');
fs.writeFileSync(`bench/x62/receipts/rhizoma-${laneSlug}.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!result.exact || !result.fullFrontierMeasured || (result.applied && result.messageTokens >= result.frontierTokens)) process.exitCode = 1;
