import fs from 'node:fs';
import { syntomosEncode } from '@/lib/omega/syntomos';
import { chironParseTape } from '@/lib/omega/chiron';
import { scriptOfChar } from '@/lib/omega/syntomia';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
for (const f of ['bench/holdout-ops/git-log-fuller.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/email-thread.txt','bench/holdout-work/meeting-transcript.txt']) {
  const t=fs.readFileSync(f,'utf8');
  const r:any=syntomosEncode(t,enc);
  const si=r.wire.indexOf('¶'); const tape = si>=0? r.wire.slice(1,si) : '';
  const parsed = tape? (chironParseTape(tape, scriptOfChar(tape[0]) as any) as any[]) : [];
  console.log('---', f.split('/').pop(), 'raw', r.inTokens, 'msg', r.messageTokens, 'parent='+r.parent, 'contract', T(r.contract));
  console.log('   rules', parsed.length, '| best expansions:', parsed.slice(0,12).map((p:any)=>JSON.stringify(p.body)+'@'+p.count).join(' '));
  // count repeated substrings by length/occurrence to see what thresholds block
  const occ = new Map<string,number>();
  for (let L=2;L<=40;L++){ const seen=new Set<string>();
    for(let i=0;i+L<=t.length;i++){const s=t.slice(i,i+L); if(!seen.has(s)){seen.add(s);occ.set(s,(occ.get(s)||0)+1);}} }
  const good=[...occ.entries()].filter(([s,c])=>c>=2 && s.replace(/\s/g,'').length>1);
  const score=good.map(([s,c])=>({s,c,g:(c-1)*T(s)-2})).filter(x=>x.g>0).sort((a,b)=>b.g-a.g);
  console.log('   raw repeated substrings scoring >0:', score.length, '| top:', score.slice(0,8).map(x=>`${JSON.stringify(x.s.slice(0,22))}x${x.c}g+${x.g}`).join(' '));
}
