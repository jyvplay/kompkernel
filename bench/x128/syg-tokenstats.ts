import * as fs from 'node:fs';
import { encode, decode } from 'gpt-tokenizer/encoding/o200k_base';
for (const p of (process.env.LANES??'').split(',').filter(Boolean)) {
  const src = fs.readFileSync(p,'utf8');
  const ids = encode(src);
  const toks = ids.map(i => decode([i]));
  const freq = new Map<string,number>();
  for (const t of toks) freq.set(t,(freq.get(t)??0)+1);
  const top = [...freq.entries()].sort((a,b)=>b[1]-a[1]);
  console.log(`\n${p.replace('bench/','')}  tokens=${toks.length} distinct=${freq.size}`);
  for (const K of [20,50,100,200,400]) {
    const inSet = new Set(top.slice(0,K).map(e=>e[0]));
    let cov=0, adj=0;
    for (let i=0;i<toks.length;i++){ if(inSet.has(toks[i]!)) cov++; if(i+1<toks.length && inSet.has(toks[i]!)&&inSet.has(toks[i+1]!)) adj++; }
    console.log(`  K=${String(K).padStart(3)} covered=${String(cov).padStart(4)}/${toks.length}  glyphGlyphAdj=${String(adj).padStart(4)}  ruleCost=2K=${2*K}  breakEvenMergeRate=${(2*K/Math.max(1,adj)*100).toFixed(0)}%`);
  }
  console.log(`  top14: ${top.slice(0,14).map(([w,c])=>`${JSON.stringify(w)}x${c}`).join(' ')}`);
}
