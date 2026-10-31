import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { jsonEscapeFoldContract, jsonEscapeFoldDecodeEnvelope, jsonEscapeFoldEncode, jsonEscapeFoldPlan } from '../../src/lib/omega/json-escape-fold';

const fixture = process.argv[2] ?? 'bench/z45/canon/spdx/MIT.json';
const source = fs.readFileSync(fixture, 'utf8');
const started = Date.now();
const plan = jsonEscapeFoldPlan(source);
const result = jsonEscapeFoldEncode(source, 'o200k_base');
const independentRestored = plan ? jsonEscapeFoldDecodeEnvelope(result.candidateMessage ?? '', plan.transformed) : null;
const sourceBytesEqual = Buffer.compare(Buffer.from(result.decoded, 'utf8'), Buffer.from(source, 'utf8')) === 0;
const independentEnvelopeSourceBytesEqual = independentRestored !== null &&
  Buffer.compare(Buffer.from(independentRestored, 'utf8'), Buffer.from(source, 'utf8')) === 0;
const receipt = {
  run: { fixture, encoding: 'o200k_base', OMEGA_DET: process.env.OMEGA_DET ?? null, node: process.version,
    startedAt: new Date().toISOString(), cost: 'direct o200k_base count of each complete in-band transform-contract + TAGSTACK/SIBLING message; same-source TAGSTACK runtime parents plus SIBLING-TEMPLATE; not registry-wide' },
  source: { sha256: crypto.createHash('sha256').update(source, 'utf8').digest('hex'), chars: source.length, rawTokens: countTokens(source, 'o200k_base') },
  plan: plan ? { exact: plan.exact, replacements: plan.replacements, byEscape: plan.byEscape,
    markerCodePoint: plan.marker.codePointAt(0), transformedChars: plan.transformed.length,
    transformedRawTokens: countTokens(plan.transformed, 'o200k_base'), directCompleteTransformMessageTokens:
      countTokens(`${jsonEscapeFoldContract(plan.marker)}\n${plan.transformed}`, 'o200k_base') } : null,
  result: { applied: result.jsonEscapeFold, exact: result.exact, frontierComplete: result.frontierComplete,
    decodedEqualsSource: result.decoded === source,
    sourceBytesEqual,
    independentlyEnvelopeRestoredEqualsSource: independentRestored === source,
    independentEnvelopeSourceBytesEqual,
    messageTokens: result.messageTokens, sourceFrontierTokens: result.sourceFrontierTokens,
    sourceWinner: result.parentCodec, candidateTokens: result.candidateTokens, candidateExact: result.candidateExact,
    replacements: result.replacements, elapsedMs: Date.now() - started, notes: result.notes },
};
fs.mkdirSync('bench/x66/receipts', { recursive: true });
const out = `bench/x66/receipts/${fixture.split('/').at(-1)!.replace(/[^A-Za-z0-9.-]/g, '_')}-fullgate.json`;
fs.writeFileSync(out, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!result.exact || !result.frontierComplete || result.decoded !== source || !sourceBytesEqual ||
    !independentEnvelopeSourceBytesEqual || countTokens(result.message, 'o200k_base') !== result.messageTokens) process.exitCode = 1;
