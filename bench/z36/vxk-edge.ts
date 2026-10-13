// Z33: VERITAS-S edge and fuzz round-trips through the shipped decoder. Exactness is byte equality.
import { veritasRDecode } from '@/lib/omega/veritas-r';
import { veritasKEncode as veritasREncode } from '@/lib/omega/veritas-k';
import { aliasPool } from '@/lib/omega/veritas-a';
const cases: string[] = [
  '', 'a', '~', '~~', '~N', '\n', '\r\n', '\t\t', 'é漢字😀', 'x'.repeat(10000),
  '[[VXR\nabc', '[[VXC\n]]\nx', '[[VXA\nq=w\n]]\n', '[[VXR\n]]\nx', '[[VXN\n', '[[VXR\n# VXR: legend\n]]\n',
  'the the the the the the the the the the the the the the the the',
  'a~Nb~~c~Rd'.repeat(50), 'ab\ncd\nab\ncd\nab\ncd\n'.repeat(30),
  aliasPool('o200k_base').slice(0, 30).join('') + aliasPool('o200k_base').slice(0, 30).join(''),
  'function f(x){return x+1}\n'.repeat(200) + 'function g(x){return x+2}\n'.repeat(100),
];
let fails = 0, n = 0;
const check = (label: string, t: string) => {
  n++;
  const r = veritasREncode(t);
  const d = veritasRDecode(r.wire);
  if (d !== t || r.decoded !== t || !r.exact) { fails++; console.log('FAIL', label, JSON.stringify(t.slice(0, 60))); }
};
cases.forEach((t, i) => check('case' + i, t));
// fuzz: deterministic LCG, small alphabets with repeats, incl. sentinel-like and escape chars
let seed = 12345;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
const alphabets = ['ab', 'abc ~\n', 'the cat ', '[]V{XS}\n~', 'xyz0123456789 \t'];
for (let k = 0; k < 400; k++) {
  const A = alphabets[k % alphabets.length];
  const len = Math.floor(rnd() * 600);
  let s = '';
  for (let i = 0; i < len; i++) s += A[Math.floor(rnd() * A.length)];
  if (k % 25 === 0) s = '[[VXR\n' + s;
  if (k % 37 === 0) s = s + s;
  check('fuzz' + k, s);
}
console.log(JSON.stringify({ cases: n, fails }));
