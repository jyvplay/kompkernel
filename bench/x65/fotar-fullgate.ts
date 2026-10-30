import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { fotarEncode, fotarPlan } from '../../src/lib/omega/fotar';

const fixture = 'bench/holdout-ops/openstack-loghub-26.log';
const source = fs.readFileSync(fixture, 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const plan = fotarPlan(source, 'o200k_base');
const start = performance.now();
const result = fotarEncode(source, 'o200k_base');
const elapsedMs = performance.now() - start;
const receipt = {
  runtime: process.version, fixture, sourceSha256, sourceChars: source.length,
  rawTokens: countTokens(source, 'o200k_base'),
  plan: plan ? { exact: plan.exact, entries: plan.entries.length, aliases: plan.entries.reduce((n, e) => n + e.frequency, 0),
    mappedChars: plan.mapped.length, directContractMapTokens: plan.directMessageTokens } : null,
  result: { fotar: result.fotar, exact: result.exact, frontierComplete: result.frontierComplete,
    decodedEqualsSource: result.decoded === source, messageTokens: result.messageTokens,
    sourceFrontierTokens: result.parentTokens, winner: result.parentCodec, candidateTokens: result.candidateTokens,
    candidateExact: result.candidateExact, elapsedMs: Math.round(elapsedMs * 1000) / 1000,
    messageSha256: crypto.createHash('sha256').update(result.message).digest('hex'), notes: result.notes },
};
fs.mkdirSync('bench/x65/receipts', { recursive: true });
fs.writeFileSync('bench/x65/receipts/fotar-fullgate.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (!result.exact || !result.frontierComplete || result.decoded !== source || countTokens(result.message, 'o200k_base') !== result.messageTokens) process.exitCode = 1;
