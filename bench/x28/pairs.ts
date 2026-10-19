import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SCRIPTS } from '@/lib/omega/chiron';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
function pool(name: string, enc: any) {
  const sc: any = CHIRON_SCRIPTS.find((x: any) => x.name === name);
  const out: string[] = [];
  for (const [a, b] of (sc.ranges ?? [[sc.lo, sc.hi]]) as Array<[number, number]>)
    for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (T(ch) === 1) out.push(ch); }
  return out;
}
for (const name of ['cyrillic', 'polyglot', 'cjk']) {
  const P = pool(name, enc);
  const N = Math.min(P.length, 130);
  const sub = P.slice(0, N);
  let one = 0, tot = 0;
  const samples: string[] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (i === j) continue; tot++;
    const s = sub[i] + sub[j];
    if (T(s) === 1) { one++; if (samples.length < 12) samples.push(s); }
  }
  console.log(name.padEnd(10), 'pool', String(P.length).padStart(5), '| 1-token chars tested', N,
    '| 2-char single tokens', String(one).padStart(6), '/', tot, '=', (100*one/tot).toFixed(1) + '%');
  console.log('   samples:', samples.join(' '));
}
