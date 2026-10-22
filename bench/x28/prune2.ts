import fs from 'node:fs';
import { metathesisEncode, metathesisDecode } from '@/lib/omega/metathesis';
import { chironParseTape, chironDecode } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r: any = metathesisEncode(t, enc);
const si = r.wire.indexOf('¶'); const tape = r.wire.slice(1, si), body0 = r.wire.slice(si + 1);
const sc: any = scriptOfChar(tape[0]);
const parsed: any[] = chironParseTape(tape, sc) || [];
const ex = new Map<string,string>();
for (const p of parsed) { let s = p.raw; for (let k=0;k<12;k++){ let n=''; for (const c of s) n += ex.get(c) ?? c; if (n===s) break; s=n; } ex.set(p.glyph, s); }
const base = T(r.wire);
console.log(f.split('/').pop(), '| rules', parsed.length, '| wire', base, '| tape', T(tape), '| body', T(body0));
// is each rule referenced by a LATER rule (nesting)? if so, removal is complex -> flag
const refd = new Set<string>();
for (let i = 0; i < parsed.length; i++) for (let j = i+1; j < parsed.length; j++) if (parsed[j].raw.includes(parsed[i].glyph)) refd.add(parsed[i].glyph);
const gains: Array<[string,number,number]> = [];
for (let i = 0; i < parsed.length; i++) {
  if (refd.has(parsed[i].glyph)) continue;
  // remove rule i: drop tape entry, revert all body occurrences to expanded phrase
  let nt = '';
  for (let j = 0; j < parsed.length; j++) if (j !== i) nt += parsed[j].glyph + parsed[j].raw;
  const nb = [...body0].map(c => c === parsed[i].glyph ? ex.get(parsed[i].glyph)! : c).join('');
  const w = '§' + nt + '¶' + nb;
  const d = T(w) - base;
  if (d < 0) gains.push([parsed[i].glyph, d, i]);
}
gains.sort((a,b)=>a[1]-b[1]);
console.log('rules removable with GAIN:', gains.length, '| total gain', gains.reduce((a,g)=>a+g[1],0));
for (const [g,d,i] of gains.slice(0,12)) console.log('   drop glyph', JSON.stringify(g), 'gain', d, 'phrase', JSON.stringify(ex.get(g)!.slice(0,40)));
if (gains.length) {
  const drop = new Set(gains.map(g => g[0]));
  let nt = ''; for (let j=0;j<parsed.length;j++) if (!drop.has(parsed[j].glyph)) nt += parsed[j].glyph + parsed[j].raw;
  let nb = [...body0].map(c => drop.has(c) ? ex.get(c)! : c).join('');
  const w = '§' + nt + '¶' + nb;
  const undo = (x: string) => (r.parent === 'identity' ? x : chironDecode(x));
  console.log('AFTER dropping all: wire', T(w), 'delta', T(w)-base, 'exact', metathesisDecode(w, { stats: r.stats, order: r.order, undo }) === t);
}
