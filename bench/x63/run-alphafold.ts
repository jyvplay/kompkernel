import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { alphafoldEncode } from '../../src/lib/omega/alphafold';
import { countTokens } from '../../src/lib/omega/bpe';

const path = process.argv[2] ?? 'src/lib/omega/codec-synthesis.ts';
const text = fs.readFileSync(path, 'utf8');
const started = Date.now();
const result = alphafoldEncode(text, 'o200k_base');
const receipt = {
  config: {
    path, encoding: 'o200k_base', node: process.version,
    OMEGA_DET: process.env.OMEGA_DET ?? null,
    cost: 'complete in-band ALPHAFOLD contract + template definitions and per-instance identifier maps, encoded by TAGSTACK runtime parents + SIBLING-TEMPLATE, against the complete same-source frontier',
    scope: 'TAGSTACK runtime-parent frontier plus SIBLING-TEMPLATE; not a registry-wide tournament',
  },
  input: { sha256: crypto.createHash('sha256').update(text).digest('hex'), chars: text.length,
    tokens: countTokens(text, 'o200k_base') },
  result: { applied: result.applied, exact: result.exact, messageTokens: result.messageTokens,
    sourceFrontierTokens: result.frontierTokens, parentCodec: result.parentCodec,
    templates: result.templates, references: result.references, transformedChars: result.transformedChars,
    planMs: result.planMs, elapsedMs: Date.now() - started,
    fullFrontierMeasured: result.fullFrontierMeasured, comparison: result.comparison },
};
fs.mkdirSync('bench/x63/receipts', { recursive: true });
const slug = path.split('/').at(-1)!.replace(/\.ts$/u, '');
fs.writeFileSync(`bench/x63/receipts/alphafold-${slug}.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!result.exact || !result.fullFrontierMeasured) process.exitCode = 1;
