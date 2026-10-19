import fs from 'node:fs';
import { metathesisEncode, metathesisDecode } from '@/lib/omega/metathesis';
import { chironParseTape, CHIRON_SCRIPTS, chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as any;
const T = (s: string) => countTokens(s, enc);
const sc: any = CHIRON_SCRIPTS.find((x: any) => x.name === 'cyrillic');
function pool() { const out: string[] = []; for (let cp = sc.lo; cp < sc.hi; cp++) { const ch = String.fromCodePoint(cp); if (T(ch) === 1) out.push(ch); } return out; }
const POOL = pool();

// 1-token bigram table among pool chars
const S2 = new Set<string>();
const partners = new Map<string, string[]>();
for (let i = 0; i < POOL.length; i++) for (let j = 0; j < POOL.length; j++) {
  if (i === j) continue;
  const s = POOL[i] + POOL[j];
  if (T(s) === 1) { S2.add(s); if (!partners.has(POOL[i])) partners.set(POOL[i], []); partners.get(POOL[i])!.push(POOL[j]); }
}
console.log('pool', POOL.length, 'S2', S2.size);

const f = process.env.F!;
const t = fs.readFileSync(f, 'utf8');
const r: any = metathesisEncode(t, enc);
const si = r.wire.indexOf('¶');
const tape = r.wire.slice(1, si), sBody = r.wire.slice(si + 1);
const parsed: any = chironParseTape(tape, sc);
const glyphOfRule: string[] = parsed.map((p: any) => p.glyph);
const idxOf = new Map<string, number>(); glyphOfRule.forEach((g, i) => idxOf.set(g, i));

// decompose body into runs of rule-indices
const G = /[Ѐ-ӿ]/;
const runs: number[][] = []; let cur: number[] = [];
for (const ch of sBody) { if (idxOf.has(ch)) cur.push(idxOf.get(ch)!); else { if (cur.length) runs.push(cur); cur = []; } }
if (cur.length) runs.push(cur);
// bigram weights
const bw = new Map<string, number>();
for (const rn of runs) for (let k = 0; k + 1 < rn.length; k++) { const key = rn[k] + ':' + rn[k+1]; bw.set(key, (bw.get(key)||0)+1); }
const bigrams = [...bw.entries()].sort((a,b)=>b[1]-a[1]);
const lens: Record<number, number> = {}; for (const rn of runs) lens[Math.min(rn.length,5)] = (lens[Math.min(rn.length,5)]||0)+1;
console.log('rules', parsed.length, 'runs', runs.length, 'len dist', JSON.stringify(lens), 'distinct bigrams', bigrams.length);
console.log('top bigrams', bigrams.slice(0,10).map(([k,v])=>k+'x'+v).join(' '));

// greedy labeling: assign chars so weighted bigrams land in S2
const A = new Array(parsed.length).fill(null);
const used = new Set<string>();
let hits = 0, hitW = 0, totW = 0;
for (const [key, w] of bigrams) {
  totW += w;
  const [a, b] = key.split(':').map(Number);
  const ca = A[a], cb = A[b];
  if (ca && cb) { if (S2.has(ca+cb)) { hits++; hitW += w; } continue; }
  if (ca && !cb) { const p = (partners.get(ca)||[]).find(x=>!used.has(x)); if (p) { A[b]=p; used.add(p); hits++; hitW+=w; } continue; }
  if (!ca && cb) { const p = (partners.get(cb)||[]).find(x=>!used.has(x)); if (p) { A[a]=p; used.add(p); hits++; hitW+=w; } continue; }
  // both unassigned: find unused pair in S2
  let done = false;
  for (const x of POOL) { if (used.has(x)) continue; for (const y of (partners.get(x)||[])) { if (y===x||used.has(y)) continue; A[a]=x; A[b]=y; used.add(x); used.add(y); hits++; hitW+=w; done=true; break; } if (done) break; }
}
// fill unassigned
let pi = 0; for (let i=0;i<A.length;i++) if (!A[i]) { while (pi < POOL.length && used.has(POOL[pi])) pi++; if (pi<POOL.length) { A[i]=POOL[pi]; used.add(POOL[pi]); } }
console.log('bigram hits', hits, '/', bigrams.length, 'weighted', hitW, '/', totW);

function build(assign: string[]) {
  const map = new Map<string,string>(); glyphOfRule.forEach((g,i)=>map.set(g, assign[i]));
  const rl = (s: string) => [...s].map(c=>map.get(c) ?? c).join('');
  return '§' + rl(tape) + '¶' + rl(sBody);
}
const baseW = r.wire;
const newW = build(A);
console.log('parent wire tokens', T(baseW), '-> BLGA wire tokens', T(newW), ' delta', T(newW)-T(baseW));
// exactness
const undo = (w: string) => (r.parent === 'identity' ? w : chironDecode(w));
console.log('BLGA exact:', metathesisDecode(newW, { stats: r.stats, order: r.order, undo }) === t);
