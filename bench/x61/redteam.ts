import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { syndesmosExpand, syndesmosPlan } from '../../src/lib/omega/syndesmos';

type Case = { name: string; text: string; expectPlan: boolean; expectPrefix?: boolean };
const cases: Case[] = [
  { name: 'repeated destination with distinct labels', text: '[one](https://example.org/a-long/path) and [two](https://example.org/a-long/path) and [three](https://example.org/a-long/path)', expectPlan: true },
  { name: 'common long URL prefix is factored in-band', text: Array.from({ length: 30 }, (_, i) => `[change${i}](https://github.com/acme/project/pull/${100 + i}/files)`).join(' '), expectPlan: true, expectPrefix: true },
  { name: 'prefix factoring composes with repeated URL aliases', text: [...Array.from({ length: 30 }, (_, i) => `[issue${i}](https://docs.example.org/api/v2/project/issues/${100 + i})`), '[repeat](https://docs.example.org/api/v2/project/issues/100)'].join(' '), expectPlan: true, expectPrefix: true },
  { name: 'interleaved first-seen dictionary IDs', text: '[a](https://a.example/long/target) [b](https://b.example/long/target) [a2](https://a.example/long/target) [b2](https://b.example/long/target)', expectPlan: true },
  { name: 'CRLF and no final newline', text: '[x](https://example.org/long)\r\nplain https://example.org/long\r\n[y](https://example.org/long)', expectPlan: true },
  { name: 'Unicode label and percent escape', text: '[café 東京](https://example.org/a%2Fb?x=1&y=%E2%9C%93)\n[again](https://example.org/a%2Fb?x=1&y=%E2%9C%93)', expectPlan: true },
  { name: 'bare and reference-style URLs remain unchanged', text: 'https://example.org/long\n[x][ref]\n[ref]: https://example.org/long\n[a](https://example.org/long)\n[b](https://example.org/long)', expectPlan: true },
  { name: 'link-like code fence text restores exactly', text: '```md\n[a](https://example.org/long)\n[b](https://example.org/long)\n```', expectPlan: true },
  { name: 'single-use URLs have no candidate', text: '[a](https://a.example/one) [b](https://b.example/two)', expectPlan: false },
  { name: 'collision sentinel refuses', text: 'literal ⟦U marker\n[a](https://example.org/long) [b](https://example.org/long)', expectPlan: false },
  { name: 'ordinary one-time Markdown remains unchanged', text: '# Study notes\nA paragraph with no repeated link target.', expectPlan: false },
];

let pass = 0;
const checks: Array<{ name: string; pass: boolean; detail?: unknown }> = [];
const twinVectors: Array<{ name: string; transformed: string; expected: string }> = [];
for (const c of cases) {
  const p = syndesmosPlan(c.text);
  const gotPlan = p !== null;
  let exact = !p || syndesmosExpand(p.transformed) === c.text;
  if (p) twinVectors.push({ name: c.name, transformed: p.transformed, expected: c.text });
  const gotPrefix = p?.prefix !== null && p?.prefix !== undefined;
  const prefixOk = c.expectPrefix === undefined || gotPrefix === c.expectPrefix;
  const ok = gotPlan === c.expectPlan && exact && prefixOk;
  console.log(JSON.stringify({ name: c.name, pass: ok, expectPlan: c.expectPlan, gotPlan, exact, expectPrefix: c.expectPrefix, gotPrefix }));
  checks.push({ name: c.name, pass: ok, detail: { expectPlan: c.expectPlan, gotPlan, exact, expectPrefix: c.expectPrefix, gotPrefix } });
  if (ok) pass++;
}
// The patch-specific attack: a forward reference must never be accepted.
const invalidRef = syndesmosExpand('[x](⟦U0⟧)', []);
const invalidOk = invalidRef === null;
console.log(JSON.stringify({ name: 'forward-reference attack is rejected', pass: invalidOk, decoded: invalidRef }));
checks.push({ name: 'forward-reference attack is rejected', pass: invalidOk, detail: { decoded: invalidRef } });
if (invalidOk) pass++;
const twin = spawnSync('python3', ['bench/x61/syndesmos-twin.py'], {
  input: JSON.stringify(twinVectors), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
});
if (twin.status !== 0) throw new Error(`CPython twin failed: ${twin.stderr || twin.stdout}`);
const twinResult = JSON.parse(twin.stdout) as { total: number; passed: number; failures: string[] };
console.log(JSON.stringify({ independentCPython: twinResult }));
if (twinResult.passed !== twinResult.total) throw new Error('independent CPython mismatch');
const summary = { pass, total: cases.length + 1, independentCPython: `${twinResult.passed}/${twinResult.total}` };
console.log(JSON.stringify({ summary }));
fs.mkdirSync('bench/x61/receipts', { recursive: true });
fs.writeFileSync('bench/x61/receipts/syndesmos-redteam.json', JSON.stringify({ runtime: process.version, checkCount: checks.length,
  checks, independentCPython: twinResult, summary }, null, 2) + '\n');
if (pass !== cases.length + 1) process.exitCode = 1;
