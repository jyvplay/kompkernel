import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { metatronEncode } from '../src/lib/omega/metatron';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { sibylEncode } from '../src/lib/omega/sibyl';
import { chironDecode, CHIRON_SCRIPTS, chironInScript } from '../src/lib/omega/chiron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
for(const f of ['ru-kb.txt','pl-kb.txt','ja-kb.txt','tr-kb.txt','de-kb.txt']){
  const t=fs.readFileSync('bench/holdout-lang/'+f,'utf8');
  const raw=T(t);
  // which CHIRON scripts collide with this source?
  const coll=CHIRON_SCRIPTS.filter(s=>[...t].some(ch=>chironInScript(s,ch.codePointAt(0)!))).map(s=>s.name);
  let a:any,b:any,m:any;
  try{a=ariadneEncode(t,ENC,{budgetMs:4000});}catch(e){a={mode:'ERR'};}
  try{b=sibylEncode(t,ENC,{budgetMs:4000});}catch(e){b={mode:'ERR'};}
  try{m=metatronEncode(t,ENC,{budgetMs:4000});}catch(e){m=null;}
  console.log(`\n${f} raw=${raw} colliding-scripts=[${coll.join(',')}]`);
  console.log(`  ariadne mode=${a.mode} wire=${a.outTokens??'-'} msg=${a.messageTokens??'-'} rules=${a.phraseRules??a.rules??'-'} script=${a.script??'-'} notes=${String(a.notes??'').slice(0,150)}`);
  console.log(`  sibyl   mode=${b.mode} wire=${b.outTokens??'-'} msg=${b.messageTokens??'-'} rules=${b.phraseRules??b.rules??'-'} script=${b.script??'-'}`);
  console.log(`  metatron winner=${m?.winner} msg=${m?.messageTokens}`);
  // whole-word repeat profile
  const words=(t.match(/[^\r\n\p{L}\p{N}]?[\p{L}\p{N}]+/gu)??[]);
  const fr=new Map<string,number>(); for(const w of words) fr.set(w,(fr.get(w)??0)+1);
  const rep=[...fr.entries()].filter(([w,c])=>c>=3).sort((x,y)=>(y[1]*T(y[0]))-(x[1]*T(x[0])));
  const ceiling=rep.reduce((s,[w,c])=>s+Math.max(0,c*T(w)-T(w)-1-c*0.5),0);
  console.log(`  words=${words.length} distinct=${fr.size} repeated>=3=${rep.length} naive whole-word ceiling=${Math.round(ceiling)} tok (${(100*ceiling/raw).toFixed(1)}%)`);
  console.log(`  top: ${rep.slice(0,8).map(([w,c])=>`${JSON.stringify(w)}x${c}(${T(w)}t)`).join(' ')}`);
}
