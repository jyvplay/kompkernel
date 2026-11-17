import { countTokens, countTokensExact } from '../../src/lib/omega/bpe';
const enc='o200k_base' as const;
let seed=12345; const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/0x100000000;};
// alphabets: the real wire distribution (greek/cyrillic/cjk/latin/digits/punct/space)
const pools = [
  'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔ',
  'абвгдежзийклмнопрстуфхцчшщъыьэюя',
  '亜哀愛悪握圧扱宛嵐安暗以意位',
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '0123456789',
  ' \t\n.,;:-_/\\|+=*#@()[]{}<>"\'`~!?%$^&',
  '¶§±×÷→←∞≈≡',
];
const strings: string[] = [];
for (let t=0;t<60000;t++){
  const pool = pools[(rnd()*pools.length)|0]!;
  const len = 1 + ((rnd()*40)|0);
  let s='';
  for (let i=0;i<len;i++) s += pool[(rnd()*pool.length)|0]!;
  strings.push(s);
}
// plus real corpus slices
import * as fs from 'node:fs';
for (const p of ['bench/holdout-x41/apt-real.txt','bench/holdout/code-ts.txt','bench/holdout-md/kb-article.md']) {
  if(!fs.existsSync(p)) continue;
  const t=fs.readFileSync(p,'utf8');
  for (let i=0;i<8000;i++){ const a=(rnd()*t.length)|0; strings.push(t.slice(a, a + 1 + ((rnd()*60)|0))); }
}
let bad=0, n=0;
for (const s of strings) {
  if (s==='') continue;
  n++;
  const fast = countTokens(s, enc);
  const truth = countTokensExact(s, enc);
  if (fast !== truth) { if (bad<5) console.log(`MISMATCH len=${s.length} fast=${fast} truth=${truth} ${JSON.stringify(s.slice(0,40))}`); bad++; }
}
console.log(`arm=${process.env.OMEGA_MERGECOUNT_SHIFT==='1'?'shift(old)':'list(new)'} n=${n} mismatches=${bad}`);
