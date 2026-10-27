import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { atxReleaseRestore, atxReleaseTransform } from '../../src/lib/omega/atx-release';

let checks = 0;
let generated = 0;
const check = (condition: unknown, message: string): void => {
  assert.ok(condition, message);
  checks++;
};
const roundTrip = (source: string, label: string): void => {
  const plan = atxReleaseTransform(source);
  check(plan !== null, `${label}: expected an eligible plan`);
  const decoded = atxReleaseRestore(plan!.text);
  check(decoded === source, `${label}: code-unit round trip`);
  check(Buffer.compare(Buffer.from(decoded, 'utf8'), Buffer.from(source, 'utf8')) === 0,
    `${label}: UTF-8 byte round trip`);
};

roundTrip([
  '# Release notes',
  '',
  '## v1.2.3 (2026-01-04)',
  'A paragraph with an inline date 2026-01-04.',
  '## 7.0.0-beta.2 (2026-02-05)',
  '',
  '## Ωmega / first release (2026-03-06)',
].join('\n'), 'mixed LF, no final newline');

roundTrip([
  '# Changelog',
  '',
  '## v2.0.0 (2024-02-29)',
  'body',
  '## v2.0.1 (2024-03-01)',
  'body',
  '## v2.0.2 (2024-03-02)',
  '',
].join('\r\n'), 'CRLF with final newline');

roundTrip([
  '## Version one (2020-01-01)',
  'plain prose',
  '## Version two (2020-01-02)',
  '### Subheading (2020-01-03)',
  '## Version three (2020-01-04)',
].join('\n'), 'preserve non-target ATX level');

const hidden = atxReleaseRestore('v1.0.0 2026-07-08\r\nv1.0.1 2026-07-09\n');
check(hidden === '## v1.0.0 (2026-07-08)\r\n## v1.0.1 (2026-07-09)\n', 'reader restores marker-free rows');

for (const [label, source] of [
  ['collision in prose', '## a (2026-01-01)\nplain 2026-01-02\n## b (2026-01-03)\n## c (2026-01-04)'],
  ['collision in unparenthesized heading', '## a (2026-01-01)\n## b 2026-01-02\n## c (2026-01-03)\n## d (2026-01-04)'],
  ['too few targets', '## a (2026-01-01)\n## b (2026-01-02)'],
  ['other heading level only', '### a (2026-01-01)\n### b (2026-01-02)\n### c (2026-01-03)'],
  ['noncanonical date punctuation', '## a (2026/01/01)\n## b (2026/01/02)\n## c (2026/01/03)'],
  ['bare carriage return', '## a (2026-01-01)\r## b (2026-01-02)\r## c (2026-01-03)'],
  ['unpaired UTF-16 surrogate', '## a (2026-01-01)\n## b (2026-01-02)\n## c (2026-01-03)\n\uD800'],
  ['empty', ''],
  ['over cap', `## a (2026-01-01)\n## b (2026-01-02)\n## c (2026-01-03)\n${'x'.repeat(100_001)}`],
] as const) {
  check(atxReleaseTransform(source) === null, `${label}: expected refusal`);
}

let seed = 0x50a7c;
const random = (): number => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed;
};
for (let n = 0; n < 200; n++) {
  const rowCount = 3 + (random() % 12);
  const eol = n % 2 ? '\n' : '\r\n';
  const lines = [`# Release ${n}`, 'Intro line.'];
  for (let i = 0; i < rowCount; i++) {
    const y = 2000 + (random() % 28);
    const m = 1 + (random() % 12);
    const d = 1 + (random() % 28);
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const title = [`v${n}.${i}.${random() % 10}`, `Ω Release ${n}-${i}`, `Feature ${i} ✓`][random() % 3]!;
    lines.push(`## ${title} (${date})`);
    if (i % 3 === 0) lines.push(`Body text ${n}/${i}.`);
  }
  if (n % 5 === 0) lines.push('');
  const source = lines.join(eol) + (n % 4 === 0 ? eol : '');
  const plan = atxReleaseTransform(source);
  check(plan !== null, `generated ${n}: eligible`);
  const decoded = atxReleaseRestore(plan!.text);
  check(decoded === source, `generated ${n}: exact`);
  check(Buffer.compare(Buffer.from(decoded, 'utf8'), Buffer.from(source, 'utf8')) === 0,
    `generated ${n}: UTF-8 bytes exact`);
  generated++;
}

const report = {
  codec: 'ATX-RELEASE',
  checks,
  generatedCases: generated,
  failures: 0,
  seed: '0x50a7c',
  sourceHash: crypto.createHash('sha256').update(fs.readFileSync('src/lib/omega/atx-release.ts')).digest('hex'),
};
fs.mkdirSync('bench/x50/receipts', { recursive: true });
fs.writeFileSync('bench/x50/receipts/atx-release-redteam.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
