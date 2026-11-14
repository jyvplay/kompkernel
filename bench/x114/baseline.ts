/**
 * X114 baseline capture. Reuses the repository's actual tagstackEncode chain and
 * X107's pinned configuration; unlike the historical A/B, runs ONE arm and
 * retains complete wires so mechanism experiments need not re-encode parents.
 * No claimed frontier total is hard-coded. Run with bench/x15/run.sh.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { tagstackEncode, type TagstackResult } from '../../src/lib/omega/tagstack';

const env = { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0',
  OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1' };
Object.assign(process.env, env);
const enc = 'o200k_base' as const;
const laneFile = process.argv[2] ?? 'bench/x109/lanes29.txt';
const out = process.argv[3] ?? 'bench/x114/receipts/baseline';
const lanes = fs.readFileSync(laneFile, 'utf8').split('\n').filter(Boolean);
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
fs.mkdirSync('bench/x114/receipts', { recursive: true });
const rows: Array<Record<string, unknown>> = [];
const stream = fs.openSync(out + '.jsonl', 'w');
const start = performance.now();
for (const path of lanes) {
  const text = fs.readFileSync(path, 'utf8');
  const t = performance.now(), cpu = process.cpuUsage();
  const r: TagstackResult = tagstackEncode(text, enc);
  const dt = performance.now() - t, dc = process.cpuUsage(cpu);
  const actual = countTokens(r.message, enc);
  const row = { path, category: null, sourceSHA256: hash(text), raw: countTokens(text, enc),
    tokens: actual, reportedTokens: r.messageTokens, exact: r.decoded === text,
    parent: r.parentCodec, arm: r.arm, message: r.message, messageSHA256: hash(r.message),
    tokenIdsSHA256: hash(JSON.stringify(encodeIds(r.message, enc))),
    wallMs: dt, cpuMs: (dc.user + dc.system) / 1000, notes: r.notes };
  rows.push(row);
  fs.writeSync(stream, JSON.stringify(row) + '\n');
  console.log(`${path.padEnd(42)} raw=${row.raw} M=${actual} exact=${row.exact} parent=${r.parentCodec} ms=${dt.toFixed(0)}`);
}
fs.closeSync(stream);
const receipt = { schema: 'kompkernel-x114-baseline-v1', date: '2026-11-14', function: 'tagstackEncode',
  encoding: enc, environment: env, node: process.version, platform: process.platform, arch: process.arch,
  sourceCommit: 'bb2b70b526acc0313db2ca62fa75f5dbbfb5e330', lanes: rows.length,
  total: rows.reduce((n, r) => n + Number(r.tokens), 0),
  exact: rows.filter(r => r.exact).length, wallMs: performance.now() - start, rows };
fs.writeFileSync(out + '.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(`TOTAL ${receipt.total} exact ${receipt.exact}/${receipt.lanes} wallMs=${receipt.wallMs.toFixed(0)}`);
if (receipt.exact !== receipt.lanes || rows.some(r => r.tokens !== r.reportedTokens)) process.exitCode = 1;
