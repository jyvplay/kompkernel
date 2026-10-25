/**
 * X44 ARCHETYPON — red team.  Pure algebra + end-to-end, OMEGA_DET=1.
 *   npx esbuild bench/x44/rt.ts --bundle --platform=node --format=esm \
 *     --outfile=bench/tmp/x44-rt.mjs && OMEGA_DET=1 node bench/tmp/x44-rt.mjs
 */
import * as fs from 'node:fs';
import {
  archetyponDiff, archetyponApply, archetyponPatchText, archetyponParsePatch,
  archetyponDecode, archetyponEncode, selfCanonPlan, selfCanonDecode,
  ARCHETYPON_CATALOGUE, type ArchetyponPlan,
} from '@/lib/omega/archetypon';

const enc: any = 'o200k_base';
let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log('  ok  ', name, extra); }
  else { fail++; console.log('  FAIL', name, extra); }
};

const MIT = ARCHETYPON_CATALOGUE.find(e => e.key === 'MIT')!;
const mitText = MIT.lines.join('\n') + '\n';

console.log('--- A. line algebra ---');
{
  const a = ['a', 'b', 'c', 'd', 'e'];
  const b = ['a', 'B', 'c', 'd', 'e'];
  const ed = archetyponDiff(a, b);
  ok('A1 single substitution -> one set', ed.length === 1 && ed[0].op === 'set' && ed[0].line === 2, JSON.stringify(ed));
  ok('A2 apply reproduces target', JSON.stringify(archetyponApply(a, ed)) === JSON.stringify(b));
  const c = ['a', 'c', 'd', 'e'];
  ok('A3 unequal length refused (no silent corruption)', archetyponDiff(a, c).length === 0 && JSON.stringify(archetyponApply(a, [])) !== JSON.stringify(c));
  const d = ['a', 'b', 'X', 'c', 'd', 'e'];
  ok('A4 unequal length refused', archetyponDiff(a, d).length === 0 && JSON.stringify(archetyponApply(a, [])) !== JSON.stringify(d));
  ok('A5 identical arrays -> no edits', archetyponDiff(a, a.slice()).length === 0);
  ok('A6 out-of-range set returns null', archetyponApply(a, [{ op: 'set', line: 99, text: 'z' }]) === null);
  ok('A7 empty template + empty target', archetyponApply([], []).length === 0);
  ok('A8 multiple substitutions', JSON.stringify(archetyponApply(a, archetyponDiff(a, ['A', 'b', 'C', 'd', 'E']))) === JSON.stringify(['A', 'b', 'C', 'd', 'E']));
}
console.log('--- B. patch grammar ---');
{
  const edits = [
    { op: 'set' as const, line: 3, text: 'Copyright (c) Acme; Ltd.' },
    { op: 'set' as const, line: 12, text: 'SOFTWARE.' },
  ];
  const pp = archetyponPatchText(edits)!;
  ok('B1 delimiter absent from values', pp !== null && edits.every(e => !e.text.includes(pp!.delim)), pp ? pp.delim : 'null');
  const back = archetyponParsePatch(pp.text, pp.delim)!;
  ok('B2 parse round trip', JSON.stringify(back) === JSON.stringify(edits), pp.text);
  ok('B3 malformed patch returns null', archetyponParsePatch('wat', ';') === null);
  ok('B4 over-long patch returns null', archetyponParsePatch(Array.from({ length: 40 }, (_, i) => `${i + 1}=x`).join(';'), ';') === null);
  ok('B5 insert/delete spellings', JSON.stringify(archetyponParsePatch('+2=hi;-4', ';')) === JSON.stringify([{ op: 'ins', line: 2, text: 'hi' }, { op: 'del', line: 4 }]));
}
console.log('--- C. parametric decode totality ---');
{
  const plan: ArchetyponPlan = {
    key: 'MIT', title: 'the standard MIT License', at: 0, srcLines: 21, tplLines: 21,
    edits: [{ op: 'set', line: 3, text: 'Copyright (c) Acme.' }],
    template: MIT.lines.slice(), eol: '\n', residualLines: [], finalEol: true,
    clause: '', clauseTokens: 0, delim: ';', patchText: '3=Copyright (c) Acme.',
  };
  const want = mitText.replace(MIT.lines[2], 'Copyright (c) Acme.');
  ok('C1 exact expansion', archetyponDecode('', plan) === want);
  ok('C2 unknown key returns wire', archetyponDecode('abc', { ...plan, key: 'NOPE' }) === 'abc');
  ok('C3 invalid edit returns wire', archetyponDecode('', { ...plan, edits: [{ op: 'set', line: 999, text: 'x' }] }) === '');
  ok('C4 CRLF eol honoured', archetyponDecode('', { ...plan, eol: '\r\n' }) === want.replace(/\n/g, '\r\n'));
  ok('C5 no final EOL', archetyponDecode('', { ...plan, finalEol: false }) === want.slice(0, -1));
}
console.log('--- D. self-canon decode totality ---');
{
  const w = 'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\n⟦1-8|2=TWO;5=FIVE⟧\n';
  const back = selfCanonDecode(w, ';');
  ok('D1 exact expansion', back === 'one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\none\nTWO\nthree\nfour\nFIVE\nsix\nseven\neight\n', JSON.stringify(back.slice(0, 40)));
  ok('D2 no references -> identity', selfCanonDecode('a\nb\n', ';') === 'a\nb\n');
  ok('D3 bad range -> unchanged line', selfCanonDecode('⟦9-99|x⟧\n', ';') === '⟦9-99|x⟧\n');
  ok('D4 malformed patch -> unchanged line', selfCanonDecode('a\nb\n⟦1-2|wat⟧\n', ';') === 'a\nb\n⟦1-2|wat⟧\n');
  ok('D5 CRLF preserved', selfCanonDecode('a\r\nb\r\n⟦1-2|2=B⟧\r\n', ';') === 'a\r\nb\r\na\r\nB\r\n');
  ok('D6 no final newline preserved', selfCanonDecode('a\nb\n⟦1-2|2=B⟧', ';') === 'a\nb\na\nB');
}
console.log('--- E. end-to-end exactness and gates ---');
{
  const cases: Array<[string, string]> = [
    ['E1 canonical MIT, one edit', mitText.replace(MIT.lines[2], 'Copyright (c) Globex Corp.')],
    ['E2 two edits', mitText.replace(MIT.lines[2], 'Copyright (c) Globex Corp.').replace('SOFTWARE.', 'SOFTWARE!!')],
    ['E3 CRLF', (mitText.replace(MIT.lines[2], 'Copyright (c) CRLF Inc.')).replace(/\n/g, '\r\n')],
    ['E4 no final newline', (mitText.replace(MIT.lines[2], 'Copyright (c) NoEol.')).slice(0, -1)],
    ['E5 leading header', 'Project X\n\n' + mitText.replace(MIT.lines[2], 'Copyright (c) Header.')],
    ['E6 trailing note', mitText.replace(MIT.lines[2], 'Copyright (c) Trail.') + '\nExtra note here.\n'],
    ['E7 truncated tail', MIT.lines.slice(0, 16).join('\n') + '\n'],
    ['E8 semicolon in copyright', mitText.replace(MIT.lines[2], 'Copyright (c) A; B & C.')],
    ['E9 non-canonical prose', 'Understanding Retention Policies\n\nA retention policy determines how long a system keeps data.\n'],
    ['E10 empty', ''],
  ];
  for (const [name, text] of cases) {
    const r: any = archetyponEncode(text, enc);
    ok(name, r.decoded === text && (r.archetypon ? r.messageTokens < r.inTokens : true), `arm=${r.arm} M=${r.messageTokens} raw=${r.inTokens}`);
  }
}
console.log('--- F. self-canon plan on a near-duplicate bundle ---');
{
  const block = (n: number) => [
    `// file ${n}`, '// SPDX-License-Identifier: MIT', '//', 'const A = 1;',
    'const B = 2;', 'const C = 3;', 'function f() {', `  return ${n};`, '}',
  ].join('\n');
  const text = [1, 2, 3, 4, 5, 6].map(block).join('\n\n') + '\n';
  const sc = selfCanonPlan(text, enc);
  ok('F1 plan exists', sc !== null, sc ? `refs=${sc.refs.length} saved=${sc.savedLines}` : '');
  if (sc) ok('F2 self-canon round trip exact', selfCanonDecode(sc.wire, sc.delim) === text);
}
console.log('--- G. seeded fuzz on the LCS line diff ---');
{
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  let good = 0;
  for (let k = 0; k < 200; k++) {
    const n = 4 + Math.floor(rnd() * 20);
    const a = Array.from({ length: n }, (_, i) => `L${Math.floor(rnd() * 12)}`);
    const b = a.slice();
    const e = 1 + Math.floor(rnd() * 4);
    for (let j = 0; j < e; j++) {
      const p = Math.floor(rnd() * b.length);
      b[p] = `X${Math.floor(rnd() * 9)}`;
    }
    const got = archetyponApply(a, archetyponDiff(a, b));
    if (got && JSON.stringify(got) === JSON.stringify(b)) good++;
  }
  ok('G1 200/200 seeded diff/apply round trips', good === 200, `${good}/200`);
  // unequal-length windows must be refused, never silently mis-patched
  ok('G2 unequal lengths refused', archetyponDiff(['a','b'],['a']).length === 0);
}
console.log(`\nRED TEAM: ${pass} passed, ${fail} failed`);
fs.mkdirSync('bench/x44/receipts', { recursive: true });
fs.writeFileSync('bench/x44/receipts/redteam.txt', `RED TEAM: ${pass} passed, ${fail} failed\n`);
if (fail) process.exit(1);
