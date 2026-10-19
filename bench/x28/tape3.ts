import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { chironParseTape } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r: any = metathesisEncode(t, enc);
const si = r.wire.indexOf('¶'); const tape = r.wire.slice(1, si);
const sc: any = scriptOfChar(tape[0]);
const parsed: any[] = chironParseTape(tape, sc) || [];
const ex = new Map<string,string>();
for (const p of parsed) { let s = p.raw; for (let k=0;k<12;k++){ let n=''; for (const c of s) n += ex.get(c) ?? c; if (n===s) break; s=n; } ex.set(p.glyph, s); }
const phrases = parsed.map(p => ex.get(p.glyph)!);
const glyphs = parsed.map(p => p.glyph);
const tapeOld = T(tape);
console.log(f.split('/').pop(), '| rules', parsed.length, '| parentTape', tapeOld);
// iteratively extract the most profitable shared substring into a NEW rule placed FIRST (glyph-free defs only)
let cur = phrases.slice();
const newDefs: string[] = [];   // defined first, in order; may reference earlier new rules
let bestScore = 0;
for (let round = 0; round < 80; round++) {
  // build candidate substrings over CURRENT strings
  const cnt = new Map<string, Set<number>>();
  for (let pi = 0; pi < cur.length; pi++) { const P = cur[pi]; const loc = new Set<string>();
    for (let L = 2; L <= Math.min(60, P.length); L++) for (let i = 0; i+L <= P.length; i++) loc.add(P.slice(i,i+L));
    for (const s of loc) { if (!cnt.has(s)) cnt.set(s, new Set()); cnt.get(s)!.add(pi); } }
  let best: any = null;
  for (const [s, set] of cnt) {
    if (set.size < 2) continue;
    const st = T(s); if (st < 2) continue;
    // after replacing s by a new glyph N (1 token) in each containing string:
    //   new tape = sum over new defs (glyph + def) + sum over rules (glyph + Pi')
    const ne = cur.map(P => (set.has(cur.indexOf(P)) ? P.split(s).join('\u0001') : P));
    let tot = 0;
    for (const d of newDefs) tot += 1 + T(d.split(s).join('\u0001'));
    tot += 1 + T(s);                       // the new rule itself
    for (let i = 0; i < ne.length; i++) tot += 1 + T(ne[i].replace(/\u0001/g, 'N'));
    const now0 = (() => { let x = 0; for (const d of newDefs) x += 1 + T(d); for (const P of cur) x += 1 + T(P); return x; })();
    const gain = now0 - tot;
    if (gain > 0 && (!best || gain > best.gain)) best = { s, gain, ne };
  }
  if (!best) break;
  cur = cur.map(P => P.split(best.s).join('N'));
  newDefs.push(best.s);
  bestScore += best.gain;
  if (round < 6 || round % 10 === 0) console.log('  round', round+1, 'cumulative modelled tape saving', bestScore, 'rules now', newDefs.length+cur.length);
}
// final honest tape token count
let tn = '';
for (const d of newDefs) tn += 'N' + d;
for (let i = 0; i < cur.length; i++) tn += glyphs[i] + cur[i];
console.log('FINAL: newDefs', newDefs.length, '| rebuilt tape tokens', T(tn), 'vs parent', tapeOld, '| delta', T(tn)-tapeOld);
