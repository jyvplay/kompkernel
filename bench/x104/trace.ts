/**
 * X104 — WHICH ARM WINS, AND DOES IT MOVE BETWEEN RUNS?
 * Prints the frontier-parent decision plus the chain result for one lane.
 * Control: the parent name is a label the code itself produced, not a number
 * derived by us; a stable lane must print the same parent every run.
 */
import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
const lane = process.argv[2];
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
const text = fs.readFileSync(lane, 'utf8');
const R: any = tagstackEncode(text, enc);
console.log(JSON.stringify({
  lane: lane.split('/').pop(),
  tokens: R.messageTokens,
  parent: R.parent,
  arm: R.arm,
  rules: R.rules,
  codec: R.codec,
  contract: R.contract,
  bytes: R.wire ? R.wire.length : null,
}, null, 1));
