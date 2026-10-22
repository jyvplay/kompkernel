import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript } from '@/lib/omega/chiron';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
// deterministic PRNG
function mul(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a: string[], r: () => number) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

const scripts = ['cyrillic','cjk','hangul','katakana','arabic','myanmar','khmer','polyglot'];
console.log('script        pool  N=20 ordinal  random  ratio | N=60 ordinal random ratio');
for (const s of scripts) {
  const sc: any = CHIRON_SCRIPTS.find((x: any) => x.name === s);
  if (!sc) { console.log(s.padEnd(12), 'no script'); continue; }
  const pool: string[] = [];
  for (const [a, b] of (sc.ranges ?? [[sc.lo, sc.hi]]) as Array<[number, number]>)
    for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (countTokens(ch, enc) === 1) pool.push(ch); }
  const row: string[] = [];
  for (const N of [20, 60]) {
    if (pool.length < N) { row.push(`(pool ${pool.length} < ${N})`); continue; }
    const ord = pool.slice(0, N).join('');
    const rnd = shuffle(pool.slice(0, N), mul(12345)).join('');
    row.push(`${String(T(ord)).padStart(4)}/${String(T(rnd)).padStart(4)} ${(T(ord)/T(rnd)).toFixed(2)}`);
  }
  console.log(s.padEnd(12), String(pool.length).padStart(5), row.join('  |  '));
}
