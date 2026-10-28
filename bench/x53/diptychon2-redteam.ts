// X53 DIPTYCHON-variant red team (plan-level): real GNU od plain/x2/-A n output,
// synthetic C arrays (independent renderer), adversarial near-misses that must
// refuse or round-trip. Writes bench/x53/receipts/diptychon2-redteam.json.
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import { diptychonPlan, diptychonRestore } from '../../src/lib/omega/diptychon';
const ENC = 'o200k_base' as const;
type Chk = { name: string; pass: boolean; detail?: string };
const checks: Chk[] = [];
const ok = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail });

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry(0xd153);

// independent C-array renderer (from the xxd -i output shape, written fresh)
function renderCarray(bytes: number[], perLine: number, indent: number, sep: ', ' | ',', prefix: string, upper: boolean, lastComma: boolean, frame: boolean): string {
  const hx = (b: number) => { const s = b.toString(16).padStart(2, '0'); return upper ? s.toUpperCase() : s; };
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += perLine) {
    const chunk = bytes.slice(i, i + perLine);
    const last = i + perLine >= bytes.length;
    lines.push(' '.repeat(indent) + chunk.map((b) => prefix + hx(b)).join(sep) + (last && !lastComma ? '' : ','));
  }
  if (frame) return `static const unsigned char blob[] = {\n${lines.join('\n')}\n};\nstatic const unsigned int blob_len = ${bytes.length};\n`;
  return lines.join('\n') + '\n';
}

function expectPlan(name: string, text: string, format: string) {
  const p = diptychonPlan(text, ENC);
  ok(`${name}:plan`, !!p && p.spec.format === format, p ? `fmt=${p.spec.format}` : 'no plan');
  if (p) ok(`${name}:restore`, diptychonRestore(p.reducedText, p.spec) === text);
}
function expectSafe(name: string, text: string) {
  const p = diptychonPlan(text, ENC);
  ok(`${name}:refuse-or-exact`, !p || diptychonRestore(p.reducedText, p.spec) === text, p ? `fmt=${p.spec.format}` : 'refused');
}

// --- synthetic C arrays ---
const randBytes = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 256));
for (const perLine of [12, 16, 8, 20, 10]) {
  for (const lastComma of [false, true]) {
    const n = 100 + Math.floor(rnd() * 300);
    expectPlan(`carray-pl${perLine}-lc${lastComma ? 1 : 0}`, renderCarray(randBytes(n), perLine, 2, ', ', '0x', false, lastComma, true), 'carray');
  }
}
expectPlan('carray-indent4', renderCarray(randBytes(150), 12, 4, ', ', '0x', false, false, true), 'carray');
expectPlan('carray-indent0', renderCarray(randBytes(150), 16, 0, ', ', '0x', false, false, false), 'carray');
expectPlan('carray-nosep-space', renderCarray(randBytes(150), 12, 2, ',', '0x', false, false, true), 'carray');
expectPlan('carray-upper-0X', renderCarray(randBytes(150), 12, 2, ', ', '0X', true, false, true), 'carray');
expectPlan('carray-noframe', renderCarray(randBytes(150), 12, 2, ', ', '0x', false, false, false), 'carray');
expectPlan('carray-exact-multiple', renderCarray(randBytes(192), 16, 2, ', ', '0x', false, false, true), 'carray');
expectPlan('carray-one-byte-tail', renderCarray(randBytes(193), 16, 2, ', ', '0x', false, true, true), 'carray');
// adversarial C arrays
{
  const good = renderCarray(randBytes(150), 12, 2, ', ', '0x', false, false, true).split('\n');
  const noComma = [...good]; noComma[2] = noComma[2]!.replace(/,$/, '');
  expectSafe('carray-mid-no-comma', noComma.join('\n'));
  const shortMid = [...good]; shortMid[2] = '  0x01, 0x02,';
  expectSafe('carray-short-mid-line', shortMid.join('\n'));
  const diffIndent = [...good]; diffIndent[3] = '    ' + diffIndent[3]!.trimStart();
  expectSafe('carray-mixed-indent', diffIndent.join('\n'));
  const gapMid = [...good]; gapMid.splice(2, 0, '// comment');
  expectSafe('carray-comment-mid-body', gapMid.join('\n'));
  const threeHex = [...good]; threeHex[1] = threeHex[1]!.replace('0x', '0x1');
  expectSafe('carray-3-hex-digits', threeHex.join('\n'));
}
expectSafe('prose-with-0x', 'The value 0x7f, 0x45 and 0x4c are magic numbers in ELF files.\nThey appear at offset 0.\nMore text here to be safe.\nAnd a fourth line.\n');
expectSafe('empty', '');
expectSafe('carray-3-lines-only', renderCarray(randBytes(30), 12, 2, ', ', '0x', false, false, false));

// --- real GNU od plain outputs (ground truth: the sandbox's own od) ---
fs.writeFileSync('/tmp/dip2.bin', Buffer.from(randBytes(1500)));
fs.writeFileSync('/tmp/dip2odd.bin', Buffer.from(randBytes(1501)));
fs.writeFileSync('/tmp/dip2zeros.bin', Buffer.from(new Array(800).fill(0)));
const odCases: Array<[string, string, string]> = [
  ['od-x1-hex', 'od -A x -t x1 /tmp/dip2.bin', 'od'],
  ['od-x1-oct-addr', 'od -A o -t x1 /tmp/dip2.bin', 'od'],
  ['od-x1-dec-addr', 'od -A d -t x1 /tmp/dip2.bin', 'od'],
  ['od-x1-noaddr', 'od -A n -t x1 /tmp/dip2.bin', 'od'],
  ['od-x2-hex', 'od -A x -t x2 /tmp/dip2.bin', 'od'],
  ['od-x1-zeros-squeeze', 'od -A x -t x1 /tmp/dip2zeros.bin', 'od'],
  ['od-x1-even', 'od -A x -t x2 /tmp/dip2.bin', 'od'],
];
for (const [name, cmd, fmt] of odCases) {
  const out = execSync(cmd, { encoding: 'utf8' });
  expectPlan(name, out, fmt);
}
{
  // odd byte count with -t x2: GNU od zero-extends the final word -> must refuse (documented scope)
  const out = execSync('od -A x -t x2 /tmp/dip2odd.bin', { encoding: 'utf8' });
  const p = diptychonPlan(out, ENC);
  ok('od-x2-odd-refuses', p === null, p ? 'PLANNED (bad?)' : 'refused');
  // ...but x1 of the same odd file must plan
  const out1 = execSync('od -A x -t x1 /tmp/dip2odd.bin', { encoding: 'utf8' });
  expectPlan('od-x1-odd', out1, 'od');
}
// X52 formats must be unaffected (regression spot checks)
{
  const out = execSync('od -A x -t x1z /tmp/dip2.bin', { encoding: 'utf8' });
  expectPlan('regression-od-x1z-gutter', out, 'od');
}

const fails = checks.filter((c) => !c.pass);
console.log(`DIP2-REDTEAM checks=${checks.length} fails=${fails.length}`);
for (const f of fails) console.log('  FAIL', f.name, f.detail ?? '');
fs.mkdirSync('bench/x53/receipts', { recursive: true });
fs.writeFileSync('bench/x53/receipts/diptychon2-redteam.json', JSON.stringify({ checks: checks.length, fails: fails.length, failures: fails }, null, 2));
