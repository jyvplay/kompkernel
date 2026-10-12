// Red team for VERITAS-VXM (veritasEncodeMulti). Decoder: the unchanged veritasDecode. Every case is decode-checked.
import { veritasEncodeMulti, veritasDecodeL } from '@/lib/omega/veritas-w';
import { veritasDecode } from '@/lib/omega/veritas';
let bad = 0, n = 0;
const chk = (t: string) => { n++; const r = veritasEncodeMulti(t, 'o200k_base'); const ok = veritasDecodeL(r.wire) === t && r.decoded === t && r.exact; if (!ok) { bad++; if (bad < 6) console.log('FAIL', JSON.stringify(t.slice(0, 60)), r.mode); } return r; };
const edges = ['', '~', '~~', '~0', 'x ~0 ~1 ~~ y ~N ~R', '[[VX1\n~0=trap\n]]\nnot really', '[[VX1\nno\n]]', '[[VX1\n]]\n', '[[VX1\n~a=x\n]]\n~a ~a ~a',
  'line1\r\nline2\r\n中文 🚀 ≈done\r\n', 'a'.repeat(5000), 'a'.repeat(300) + 'b'.repeat(300), 'ab'.repeat(2000), 'the the the the the the the the',
  '~a=\n~a=\n~a=\n', 'x\n~N~R~~', '\u0000\u0001\u0002'.repeat(40), '[[VX1\n'.repeat(20)];
for (const e of edges) chk(e);
let seed = 99173; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pieces = ['~', '~~', '~0', '~a', '~N', '~R', '\n', '\r\n', ' ', '\t', '[[VX1\n', ']]', '=', '0', 'a', 'bb', 'the', 'ing', ' of ', '中', '🚀', 'A1B2C3D4E5F6A7B8C9D0E1F2', '~0=', '~1='];
for (let i = 0; i < 3000; i++) {
  let t = ''; const L = 1 + Math.floor(rnd() * 80);
  for (let j = 0; j < L; j++) t += rnd() < 0.3 && t.length > 4 ? t.slice(Math.floor(rnd() * (t.length - 3)), 3 + Math.floor(rnd() * 3)) : pieces[Math.floor(rnd() * pieces.length)];
  chk(t);
}
console.log(`VXM red team: ${n} cases, failures ${bad}`);
console.log(bad === 0 ? 'ALL EXACT' : 'FAILURES');
