// PHALANX-P1 red team: edge cases targeting each stage's header and escape paths, plus a seeded fuzz.
// Every case must round-trip through phalanxDecode(wire) === input, and the wire must be ASCII when the input is.
import { phalanxEncode, phalanxDecode, PHALANX_ESC } from '@/lib/omega/phalanx';
import { DITTO_RULE, DITTO_ESC } from '@/lib/omega/ditto';
import { DIRFOLD_A_RULE, DIRFOLD_A_ESC } from '@/lib/omega/dirfold-a';
import { DIRFOLD_RULE } from '@/lib/omega/dirfold';
const u = '550e8400-e29b-41d4-a716-446655440000';
const cases: [string, string][] = [
  ['empty', ''],
  ['single line', 'hello world'],
  ['openstack-like repeated records', '2017-05-16 00:00:12 2931 INFO nova.compute\n2017-05-16 00:00:13 2931 INFO nova.compute\n2017-05-16 00:00:13 2931 WARN nova.compute'],
  ['uuid repeated', `id ${u} ok\nid ${u} ok\nid ${u} ok`],
  ['same-dir listing', 'x 1 node_modules/@babel/core/a.js\nx 2 node_modules/@babel/core/b.js\nx 3 node_modules/@babel/core/c.js'],
  ['literal equals-leading segment (dirfold-a identity)', 'a 1 src/lib/a.ts\na 2 =x\na 3 src/lib/b.ts'],
  ['literal caret fields', 'k ^a ^a\nk ^a ^a\nk ^a ^a'],
  ['starts with DITTO header', DITTO_RULE + '\nq w e\nq w e\nq w e'],
  ['starts with DITTO escape', DITTO_ESC + '\nq w e\nq w e'],
  ['starts with DIRFOLD-A header', DIRFOLD_A_RULE + '\nsrc/lib/a.ts\nsrc/lib/b.ts'],
  ['starts with DIRFOLD-A escape', DIRFOLD_A_ESC + '\nsrc/lib/a.ts\nsrc/lib/b.ts'],
  ['starts with DIRFOLD-D1 header', DIRFOLD_RULE + '\nsrc/lib/a.ts\nsrc/lib/b.ts'],
  ['starts with PHALANX escape', PHALANX_ESC + '\nsrc/lib/a.ts\nsrc/lib/b.ts'],
  ['CRLF records', 'a bbbb cccc\r\na bbbb cccc\r\na bbbb cccc\r\n'],
  ['tabs and uuids', `2026\t${u}\tsrc/a\n2026\t${u}\tsrc/a\n2026\t${u}\tsrc/a`],
  ['uuid uppercase (not folded)', 'ID 550E8400-E29B-41D4-A716-446655440000\nID 550E8400-E29B-41D4-A716-446655440000'],
  ['prose', 'The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog again.'],
  ['unicode', 'ö日本 語語語\nö日本 語語語\nö日本 語語語'],
  ['trailing newline and blank lines', 'src/lib/a.ts 1\n\nsrc/lib/b.ts 2\n'],
];
let fails = 0;
for (const [name, text] of cases) {
  const r = phalanxEncode(text, 'o200k_base');
  const ok = phalanxDecode(r.wire) === text && r.decoded === text;
  const asciiOk = !/^[\x00-\x7f]*$/.test(text) || /^[\x00-\x7f]*$/.test(r.wire);
  if (!ok || !asciiOk) fails++;
  console.log(`${ok && asciiOk ? 'PASS' : 'FAIL'}  ${name.padEnd(50)} mode=${r.mode.padEnd(8)} in=${r.inTokens} out=${r.outTokens} stages=${r.stageTokens.join('/')}`);
}
// seeded fuzz over structured listings with uuids, carets, equals, tabs, dirs, duplicates
let s = 777001 >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const dirs = ['src/lib', 'node_modules/@x/y', '/var/log/', '=odd/dir', '^caret/dir', 'a', 'x/y/z/', ''];
const names = ['a.ts', 'b', '=eq', '^c', `${u}`, 'é.md', 'file name', ''];
let fuzzFails = 0, fuzzFolded = 0;
for (let k = 0; k < 2000; k++) {
  const n = 1 + Math.floor(rnd() * 30);
  const lines: string[] = [];
  let d = pick(dirs);
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.3) d = pick(dirs);
    const sep = pick([' ', '\t', '  ']);
    const id = rnd() < 0.2 ? pick(['^', '=', 'DITTO: x', 'PHALANX: identity']) : String(Math.floor(rnd() * 1000));
    lines.push(`${id}${sep}${pick(['2026-10-11', '^k', 'INFO'])}${sep}${d}${d.endsWith('/') || d === '' ? '' : '/'}${pick(names)}`);
  }
  const text = lines.join('\n') + (rnd() < 0.2 ? '\n' : '');
  const r = phalanxEncode(text, 'o200k_base');
  if (r.mode === 'phalanx') fuzzFolded++;
  if (phalanxDecode(r.wire) !== text || r.decoded !== text) fuzzFails++;
}
console.log(`fuzz: 2000 structured listings, decode fails=${fuzzFails}, used the phalanx path=${fuzzFolded}`);
console.log(fails === 0 && fuzzFails === 0 ? 'ALL EXACT' : `FAILURES: cases=${fails} fuzz=${fuzzFails}`);
