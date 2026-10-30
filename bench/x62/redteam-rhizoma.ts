import * as fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { rhizomaExpand, rhizomaPlan } from '../../src/lib/omega/rhizoma';

const fixturePath = 'bench/z55/lanes/tree-src.txt';
const fixture = fs.readFileSync(fixturePath, 'utf8');
const astralCrlf = `root\r\n│\u00a0\u00a0├── 🌱^name\r\n│\u00a0\u00a0└── leaf\r\n│\u00a0\u00a0├── child\r\n│\u00a0\u00a0└── end`;
const cases = [
  { name: 'public tree fixture', source: fixture, expect: true },
  { name: 'CRLF, astral filename, no final newline', source: astralCrlf, expect: true },
  { name: 'NBSP outside tree indentation refuses', source: `root\n│\u00a0\u00a0├── a\nnotes\u00a0text\n│\u00a0\u00a0└── b\n│\u00a0\u00a0├── c\n│\u00a0\u00a0└── d`, expect: false },
  { name: 'one-space indentation corruption refuses', source: `root\n│\u00a0 ├── a\n│\u00a0\u00a0└── b\n│\u00a0\u00a0├── c`, expect: false },
  { name: 'reserved marker in indentation refuses', source: `root\n│\u00a0\u00a0^├── a\n│\u00a0\u00a0└── b\n│\u00a0\u00a0├── c`, expect: false },
  { name: 'ordinary ASCII tree spaces are not guessed as NBSP', source: `root\n│  ├── a\n│  └── b\n│  ├── c`, expect: false },
  { name: 'ordinary prose without tree markers is refused', source: 'plain text with spaces only', expect: false },
];
let passed = 0;
const checks: Array<{ name: string; pass: boolean; detail: unknown }> = [];
const vectors: Array<{ name: string; transformed: string; expected: string }> = [];
for (const c of cases) {
  const transformed = rhizomaPlan(c.source);
  const plan = transformed !== null;
  const exact = !transformed || rhizomaExpand(transformed) === c.source;
  const ok = plan === c.expect && exact;
  console.log(JSON.stringify({ name: c.name, pass: ok, plan, exact }));
  checks.push({ name: c.name, pass: ok, detail: { plan, exact, expectedPlan: c.expect } });
  if (ok) passed++;
  if (transformed) vectors.push({ name: c.name, transformed, expected: c.source });
}
const good = rhizomaPlan(astralCrlf)!;
const asciiShortcut = astralCrlf.replace(/\u00a0/gu, ' ');
const asciiShortcutOk = asciiShortcut !== astralCrlf;
console.log(JSON.stringify({ name: 'visually similar ASCII spaces are not byte-exact NBSP', pass: asciiShortcutOk }));
checks.push({ name: 'visually similar ASCII spaces are not byte-exact NBSP', pass: asciiShortcutOk, detail: { sourceNBSP: (astralCrlf.match(/\u00a0/gu) ?? []).length } });
if (asciiShortcutOk) passed++;
const tampered = good.replace('^', 'x');
const tamperOk = rhizomaExpand(tampered) !== astralCrlf;
console.log(JSON.stringify({ name: 'tampered structural marker cannot falsely roundtrip', pass: tamperOk }));
checks.push({ name: 'tampered structural marker cannot falsely roundtrip', pass: tamperOk, detail: null });
if (tamperOk) passed++;
const twin = spawnSync('python3', ['bench/x62/rhizoma-twin.py'], {
  input: JSON.stringify(vectors), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
});
if (twin.status !== 0) throw new Error(`independent Python decoder failed: ${twin.stderr || twin.stdout}`);
const twinResult = JSON.parse(twin.stdout) as { total: number; passed: number; failures: string[] };
const receipt = { runtime: process.version, checks, summary: { passed, total: checks.length },
  independentPython: twinResult, fixture: fixturePath };
fs.mkdirSync('bench/x62/receipts', { recursive: true });
fs.writeFileSync('bench/x62/receipts/rhizoma-redteam.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
if (passed !== checks.length || twinResult.passed !== twinResult.total) process.exitCode = 1;
