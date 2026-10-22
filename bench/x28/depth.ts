import fs from 'node:fs';
import { metathesisEncode } from '@/lib/omega/metathesis';
import { chironParseTape } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const only = process.env.IDX ? process.env.IDX.split(',').map(Number) : null;
// SLP lower bound: an SLP with n symbols needs >= 2n + log2(n!) bits (Maruyama et al., SPIRE'13)
function bits(n: number) { let l = 0; for (let i = 2; i <= n; i++) l += Math.log2(i); return 2*n + l; }
console.log('lane                                     rules  tapeTok  depth  maxChain  LB_bits  LB_tok(bytes/4.6)');
for (let i = 0; i < lanes.length; i++) {
  if (only && !only.includes(i)) continue;
  const f = lanes[i]; const t = fs.readFileSync(f,'utf8');
  let r: any; try { r = metathesisEncode(t, enc); } catch { continue; }
  const si = r.wire.indexOf('¶');
  if (si < 0) { console.log(f.split('/').pop()!.padEnd(40), 'no tape'); continue; }
  const tape = r.wire.slice(1, si);
  const sc: any = scriptOfChar(tape[0]);
  const parsed: any[] = (sc && chironParseTape(tape, sc)) || [];
  // depth(i) = 1 + max depth of glyphs referenced by rule i's body
  const idx = new Map<string, number>(); parsed.forEach((p, i2) => idx.set(p.glyph, i2));
  const depth = new Array(parsed.length).fill(0);
  let maxChain = 0;
  for (let k = 0; k < parsed.length; k++) {
    let d = 1;
    for (const c of parsed[k].raw) if (idx.has(c)) d = Math.max(d, 1 + depth[idx.get(c)!]);
    depth[k] = d; maxChain = Math.max(maxChain, d);
  }
  const n = parsed.length, lb = bits(n);
  console.log(f.split('/').pop()!.padEnd(40), String(n).padStart(5), String(T(tape)).padStart(8),
    String(maxChain).padStart(6), String(maxChain).padStart(9), lb.toFixed(0).padStart(8), (lb/4.6).toFixed(0).padStart(10));
}
