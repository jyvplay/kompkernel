import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { chironParseTape } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const only = process.env.IDX ? process.env.IDX.split(',').map(Number) : null;
console.log('lane                                     rules nestedRefs  tapeNested tapeFlat  flatCost  "repeatedly" saving');
for (let i = 0; i < lanes.length; i++) {
  if (only && !only.includes(i)) continue;
  const f = lanes[i]; const t = fs.readFileSync(f,'utf8');
  let r: any; try { r = metathesisEncode(t, enc); } catch { continue; }
  const si = r.wire.indexOf('¶');
  if (si < 0) { console.log(f.split('/').pop()!.padEnd(40), 'NOTAPE (identity parent)'); continue; }
  const tape = r.wire.slice(1, si);
  if (!tape) { console.log(f.split('/').pop()!.padEnd(40), 'NOTAPE (identity parent)'); continue; }
  const sc: any = scriptOfChar(tape[0]); const parsed: any[] = chironParseTape(tape, sc) || [];
  const ex = new Map<string,string>();
  for (const p of parsed) { let s = p.raw; for (let k=0;k<12;k++){ let n=''; for (const c of s) n += ex.get(c) ?? c; if (n===s) break; s=n; } ex.set(p.glyph, s); }
  let nestedRefs = 0; for (const p of parsed) for (const c of p.raw) if (ex.has(c)) nestedRefs++;
  // flat tape: each entry = glyph + fully expanded phrase (no cross references)
  let flat = ''; for (const p of parsed) flat += p.glyph + ex.get(p.glyph)!;
  const tn = T(tape), tf = T(flat);
  console.log(f.split('/').pop()!.padEnd(40), String(parsed.length).padStart(5), String(nestedRefs).padStart(10),
    String(tn).padStart(10), String(tf).padStart(9), String(tf-tn).padStart(9), String(tf-tn>2?'no (cost '+String(tf-tn)+')':'YES (+'+(2-(tf-tn))+')').padStart(12));
}
