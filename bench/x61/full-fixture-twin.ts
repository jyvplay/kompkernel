import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { syndesmosPlan } from '../../src/lib/omega/syndesmos';

const paths = [
  'bench/z57/lanes/prose-readme-1.md',
  'bench/z47/corpus/changelog/ucfopen_canvasapi.md',
  'bench/z47/corpus/changelog/svenstaro_miniserve.md',
];
const vectors = paths.map((path) => {
  const expected = fs.readFileSync(path, 'utf8');
  const plan = syndesmosPlan(expected);
  if (!plan) throw new Error(`No SYNDESMOS plan for ${path}`);
  return { name: path, transformed: plan.transformed, expected };
});
const twin = spawnSync('python3', ['bench/x61/syndesmos-twin.py'], {
  input: JSON.stringify(vectors), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
});
if (twin.status !== 0) throw new Error(`CPython full-fixture twin failed: ${twin.stderr || twin.stdout}`);
const result = JSON.parse(twin.stdout) as { total: number; passed: number; failures: string[] };
const receipt = { runtime: process.version, decoder: 'stdlib Python; separate implementation', vectors: paths, result };
fs.mkdirSync('bench/x61/receipts', { recursive: true });
fs.writeFileSync('bench/x61/receipts/syndesmos-full-fixture-twin.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (result.passed !== result.total) process.exitCode = 1;
