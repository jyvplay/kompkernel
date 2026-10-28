import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens } from '../../src/lib/omega/bpe';
import { bifrontPlan } from '../../src/lib/omega/bifront';
import { synkrisisEncode } from '../../src/lib/omega/synkrisis';

// Emit the rejected full candidate so the separate CPython reader can verify
// the nested parent message and the BIFRONT suffix restore independently.
const path = 'bench/holdout-ops/find-listing.txt';
const source = fs.readFileSync(path, 'utf8');
const plan = bifrontPlan(source);
if (!plan) throw new Error('find-listing no longer satisfies the BIFRONT planner');
const parent = synkrisisEncode(plan.transformed, 'o200k_base');
const rule = `After decoding the parent, append ${JSON.stringify(plan.suffix)} to every final path field.`;
const base = parent.contract.trim().replace(/\s*(?:;\s*)?print only\.$/i, '').trim();
const contract = base ? `${base} ${rule} Print only.` : `${rule} Print only.`;
const message = `${contract}\n${parent.wire}`;
const receipt = {
  lane: 'find-listing',
  source: path,
  sourceSha256: createHash('sha256').update(source, 'utf8').digest('hex'),
  suffix: plan.suffix,
  pathCount: plan.pathCount,
  transformed: plan.transformed,
  contract,
  message,
  parentReader: parent.arm,
  completeMessageTokens: countTokens(message, 'o200k_base'),
  encoding: 'o200k_base',
  note: 'Standalone rejected candidate emitted for independent CPython round-trip verification; not the shipped BIFRONT output.',
};
fs.mkdirSync('bench/x46/receipts', { recursive: true });
fs.writeFileSync('bench/x46/receipts/independent-candidate.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ lane: receipt.lane, suffix: receipt.suffix,
  pathCount: receipt.pathCount, parentReader: receipt.parentReader,
  completeMessageTokens: receipt.completeMessageTokens,
  sourceSha256: receipt.sourceSha256 }, null, 2));
