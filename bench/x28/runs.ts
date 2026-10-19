import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const only = process.env.IDX ? process.env.IDX.split(',').map(Number) : null;
const G = /[\u0400-\u04FF]/;
console.log('lane                                     glyphs  runs  L1   L2  L3  L4  L5+  gTok  gTok/glyph  bodyTok');
for (let i = 0; i < lanes.length; i++) {
  if (only && !only.includes(i)) continue;
  const f = lanes[i]; const t = fs.readFileSync(f,'utf8');
  let r: any; try { r = metathesisEncode(t, enc); } catch { continue; }
  const si = r.wire.indexOf('¶'); const body = r.wire.slice(si+1);
  const runs: number[] = []; let cur = 0, gl = 0;
  for (const ch of body) { if (G.test(ch)) { cur++; gl++; } else { if (cur) runs.push(cur); cur = 0; } }
  if (cur) runs.push(cur);
  const d: Record<number, number> = {}; for (const L of runs) d[Math.min(L,5)] = (d[Math.min(L,5)]||0)+1;
  const nonGlyph = [...body].filter((c:string)=>!G.test(c)).join('');
  const gTok = T(body) - T(nonGlyph);
  console.log(f.split('/').pop()!.padEnd(40), String(gl).padStart(5), String(runs.length).padStart(5),
    String(d[1]||0).padStart(4), String(d[2]||0).padStart(4), String(d[3]||0).padStart(4),
    String(d[4]||0).padStart(4), String(d[5]||0).padStart(4),
    String(gTok).padStart(5), (gl?(gTok/gl).toFixed(2):'-').padStart(10), String(T(body)).padStart(7));
}
