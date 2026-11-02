import * as fs from 'node:fs';
import { engrammaSelfTest, engrammaVerify, engrammaEncode } from '../../src/lib/omega/engramma';
const enc: any = 'o200k_base';
const fails = engrammaSelfTest(enc);
console.log(JSON.stringify({ selfTestFailures: fails, passed: fails.length === 0 }, null, 1));
const lanes = process.argv.slice(2);
const rows: any[] = [];
for (const f of lanes) {
  const t = fs.readFileSync(f, 'utf8');
  const w = engrammaVerify(t, enc);
  const r = engrammaEncode(t, enc);
  rows.push({ f, ...w, contractTokens: r.engrammaContractTokens, messageTokens: r.messageTokens, exact: r.decoded === t });
  console.log(JSON.stringify(rows[rows.length - 1]));
}
fs.mkdirSync('bench/x68/receipts', { recursive: true });
fs.writeFileSync('bench/x68/receipts/engramma-selftest.json', JSON.stringify({ encoding: enc, node: process.version, selfTestFailures: fails, rows }, null, 2) + '\n');
if (fails.length || rows.some(r => !r.identical || !r.decodedEqualsSource)) process.exitCode = 1;
