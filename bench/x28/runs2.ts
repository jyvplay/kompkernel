import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { chironParseTape, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const only = process.env.IDX ? process.env.IDX.split(',').map(Number) : null;
console.log('lane                                     scr       rules  tape  body  glyphs runs  L1  L2  L3  L4+  gTok g/glyph isolTok');
for (let i = 0; i < lanes.length; i++) {
  if (only && !only.includes(i)) continue;
  const f = lanes[i]; const t = fs.readFileSync(f,'utf8');
  let r: any; try { r = metathesisEncode(t, enc); } catch { continue; }
  const si = r.wire.indexOf('¶'); const tape = r.wire.slice(1, si), body = r.wire.slice(si+1);
  if (!tape) { console.log(f.split('/').pop()!.padEnd(40), 'NOTAPE'); continue; }
  const sc: any = scriptOfChar(tape[0]); if (!sc) { console.log(f.split('/').pop()!.padEnd(40), 'NOSCRIPT'); continue; }
  const parsed: any = chironParseTape(tape, sc); if (!parsed) { console.log(f.split('/').pop()!.padEnd(40), 'BADTAPE'); continue; }
  const idx = new Map<string, number>(); parsed.forEach((p: any, i: number) => idx.set(p.glyph, i));
  const inSc = (c: string) => idx.has(c);
  const runs: number[] = []; let cur = 0, gl = 0;
  for (const ch of body) { if (inSc(ch)) { cur++; gl++; } else { if (cur) runs.push(cur); cur = 0; } }
  if (cur) runs.push(cur);
  const d: Record<number, number> = {}; for (const L of runs) d[Math.min(L,4)] = (d[Math.min(L,4)]||0)+1;
  const ng = [...body].filter((c:string)=>!inSc(c)).join('');
  const gTok = T(body) - T(ng);
  const isolTok = d[1] || 0; // isolated glyphs cost ~1 token each
  console.log(f.split('/').pop()!.padEnd(40), sc.name.padEnd(9), String(parsed.length).padStart(5),
    String(T(tape)).padStart(5), String(T(body)).padStart(5), String(gl).padStart(5), String(runs.length).padStart(5),
    String(d[1]||0).padStart(4), String(d[2]||0).padStart(3), String(d[3]||0).padStart(3), String(d[4]||0).padStart(4),
    String(gTok).padStart(5), (gl?(gTok/gl).toFixed(2):'-').padStart(7), String(isolTok).padStart(6));
}
