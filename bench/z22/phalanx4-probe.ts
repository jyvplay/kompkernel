// PHALANX-P4 vs PHALANX-P3: corpus measurement, edge cases, and a fuzz red-team.
// Every wire is decoded and compared byte for byte. o200k_base token counts.
import fs from 'node:fs';
import path from 'node:path';
import { countTokens } from '@/lib/omega/bpe';
import { phalanx3Encode, phalanx3Decode } from '@/lib/omega/phalanx3';
import { phalanx4Encode, phalanx4Decode } from '@/lib/omega/phalanx4';

const dirs = ['bench/holdout-ops', 'bench/holdout', 'bench/z20/samples'];
const files = dirs.flatMap((d) => fs.readdirSync(d).filter((f) => fs.statSync(path.join(d, f)).isFile()).map((f) => path.join(d, f)));

let fail = 0;
const check = (label: string, text: string) => {
  const r = phalanx4Encode(text);
  const ok = phalanx4Decode(r.wire) === text && r.decoded === text;
  if (!ok) { fail++; if (fail <= 5) console.log('FAIL', label, JSON.stringify(text.slice(0, 80))); }
  return { r, ok };
};

console.log('== corpus (o200k tokens) ==');
let t3 = 0, t4 = 0, idT = 0;
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const p3 = phalanx3Encode(text);
  const { r, ok } = check(f, text);
  const p3ok = phalanx3Decode(p3.wire) === text;
  t3 += p3.outTokens; t4 += r.outTokens; idT += r.inTokens;
  console.log(`${f}: identity=${r.inTokens} P3=${p3.outTokens}${p3ok ? '' : '!!'} P4=${r.outTokens}${ok ? '' : '!!'} stages=[${r.applied.join(',')}]${r.vxKept ? ' vx' : ''} mode=${r.mode}`);
}
console.log(`TOTAL identity=${idT} P3=${t3} P4=${t4} (P4-P3=${t4 - t3}, ${(((t4 - t3) / t3) * 100).toFixed(2)}%)`);

console.log('== edge cases ==');
const edges: string[] = [
  '', '\n', 'a', 'x\ny', 'PHALANX-P4 legend: nope\nbody', 'PHALANX-P4: identity\nkeep me',
  'UUIDFOLD: 32 uppercase hex digits with a letter A-F = lowercase UUID; dashes after digits 8,12,16,20\nx',
  'DITTO: ^ = the same field\nq', 'DIRFOLD-A: =name = the directory\nq', 'KOINE-K1: a field "&k:r"\nq', 'RECALL-R1: a field "@d"\nq',
  '[[VX1\n~a=zz\n]]\nbody ~a', '[[VX1\nnot a dict\n', 'a b c\na b c\na b c\na b c\n', '^ ^ ^\n^ ^ ^\n^^ ^^\n',
  '@1 @2\n@1 @2\n&:x &1:y\n', '=/a/b/c\n=/a/b/c\n=/a/b/c\n', '\u00e9\u00e9 \t\t x\r\n\r\n',
  'x'.repeat(5000), 'line\n'.repeat(3000),
];
for (const [i, e] of edges.entries()) check('edge' + i, e);
console.log('edge cases checked:', edges.length);

console.log('== fuzz (3000 structured texts) ==');
let seed = 20261011;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const words = ['a', 'bb', 'ccc', '^', '^^', '=', '@1', '@:x', '&3:', '&:q', '~a', '~~', '[[VX1', ']]', 'PHALANX-P4', 'legend:', '[dt]', '/usr/lib/x', '/usr/lib/y',
  'A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6', '0123456789ABCDEF0123456789ABCDEF', '3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f', 'the', 'and', 'word', '\t', '  '];
let fz = 0;
for (let n = 0; n < 3000; n++) {
  const lines: string[] = [];
  const L = 1 + Math.floor(rnd() * 14);
  for (let i = 0; i < L; i++) {
    if (lines.length && rnd() < 0.5) { lines.push(pick(lines)); continue; }
    const k = 1 + Math.floor(rnd() * 8);
    const parts: string[] = [];
    for (let j = 0; j < k; j++) parts.push(rnd() < 0.3 && lines.length ? pick(lines.at(-1)!.split(' ')) : pick(words));
    lines.push(parts.join(rnd() < 0.8 ? ' ' : '\t'));
  }
  const text = lines.join('\n') + (rnd() < 0.2 ? '\n' : '');
  const { ok } = check('fuzz' + n, text);
  if (ok) fz++;
}
console.log(`fuzz exact ${fz}/3000`);
console.log(fail === 0 ? 'ALL EXACT' : `FAILURES ${fail}`);
// (appended) the UUIDFOLD identity prefix must not force identity on its own
{
  const t = 'UUIDFOLD: off\n3F2A9C1E7B4D4E8A9C2F1A2B3C4D5E6F\n3F2A9C1E7B4D4E8A9C2F1A2B3C4D5E6F\n';
  const r = phalanx4Encode(t);
  console.log('uuidfold-off-prefix', r.mode, r.applied.join(','), 'exact', phalanx4Decode(r.wire) === t);
}
