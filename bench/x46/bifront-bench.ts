import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { bifrontEncode, bifrontPlan, bifrontRestore } from '../../src/lib/omega/bifront';

const path = 'bench/holdout-ops/find-listing.txt';
const text = fs.readFileSync(path, 'utf8');
const plan = bifrontPlan(text);
const result = bifrontEncode(text, 'o200k_base');
const exact = result.decoded === text && (!plan || bifrontRestore(plan.transformed, plan.suffix) === text);
const receipt = {
  lane: 'find-listing', path,
  sourceSha256: createHash('sha256').update(text, 'utf8').digest('hex'),
  chars: text.length,
  inputTokens: countTokens(text, 'o200k_base'),
  parent: 'SYNKRISIS (X45)',
  parentTokens: result.parentTokens,
  candidateMessageTokens: result.messageTokens,
  delta: result.messageTokens - result.parentTokens,
  applied: result.applied,
  exact,
  suffix: plan?.suffix ?? null,
  pathCount: plan?.pathCount ?? 0,
  parentArm: result.parentArm,
  notes: result.notes,
  elapsedMs: result.ms,
  encoding: 'o200k_base',
  measure: 'countTokens(complete contract + wire)',
};
fs.mkdirSync('bench/x46/receipts', { recursive: true });
fs.writeFileSync('bench/x46/receipts/bifront-find-listing.json', JSON.stringify(receipt, null, 2) + '\n');
fs.writeFileSync('bench/x46/receipts/bifront-find-listing.message.txt', result.message);
console.log(JSON.stringify(receipt, null, 2));
if (!exact || result.messageTokens > result.parentTokens) process.exitCode = 1;
