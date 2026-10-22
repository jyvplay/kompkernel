import fs from 'node:fs';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc='o200k_base' as any;

// single-token glyph alphabet (Cyrillic block)
function alphabet(n:number):string[]{
  const out:string[]=[];
  for(let cp=0x0410;cp<0x0450 && out.length<n;cp++){
    const ch=String.fromCodePoint(cp);
    if(countTokens(ch,enc)===1) out.push(ch);
  }
  return out;
}
const ALPHA=alphabet(4000);

/**
 * Oracle-ish grammar: exact repeated TOKEN n-grams, greedy by net token gain.
 *   saving = (count-1)*(L-1) - 2
 * (body: count*L -> count*1 ; tape adds L for the phrase + 1 for its glyph)
 */
function oracle(text:string, maxL=16){
  const toks=tokenStrings(text,enc);
  const ids=toks.map(t=>t.id);
  const n=ids.length;
  // count n-grams
  const cands=new Map<string,{starts:number[],L:number}>();
  for(let L=2;L<=maxL;L++){
    const m=new Map<string,number[]>();
    for(let i=0;i+L<=n;i++){
      let key=''; for(let k=0;k<L;k++) key+=ids[i+k]+' ';
      const a=m.get(key); if(a) a.push(i); else m.set(key,[i]);
    }
    for(const [k,starts] of m) if(starts.length>=2) cands.set(k,{starts,L});
  }
  const ranked=[...cands.entries()].map(([k,v])=>({
    k,L:v.L,starts:v.starts,gain:(v.starts.length-1)*(v.L-1)-2
  })).filter(c=>c.gain>0).sort((a,b)=>b.gain-a.gain);

  const used=new Uint8Array(n);
  const chosen:typeof ranked=[];
  for(const c of ranked){
    let ok=true;
    for(const s of c.starts){ for(let k=0;k<c.L;k++) if(used[s+k]){ok=false;break;} if(!ok)break; }
    if(!ok) continue;
    for(const s of c.starts) for(let k=0;k<c.L;k++) used[s+k]=1;
    chosen.push(c);
  }
  // build wire: tape (glyph + phrase) + ¶ + body
  let tape='', body='';
  const glyphOf=new Map<string,string>();
  let gi=0;
  for(const c of chosen){ const g=ALPHA[gi++]!; glyphOf.set(c.k,g); tape+=g;
    // phrase text = tokens at c.starts[0]
    for(let k=0;k<c.L;k++) tape+=toks[c.starts[0]!+k]!.s;
  }
  for(let i=0;i<n;){
    let hit='';
    for(let L=Math.min(maxL,n-i);L>=2;L--){
      let key=''; for(let k=0;k<L;k++) key+=ids[i+k]+' ';
      if(glyphOf.has(key)){ hit=key; break; }
    }
    if(hit){ body+=glyphOf.get(hit); const L=hit.split(' ').length-1; i+=L; }
    else { body+=toks[i]!.s; i++; }
  }
  // verify round trip
  let back=body;
  for(let iter=0;iter<50;iter++){
    let changed=false;
    for(const [k,g] of glyphOf){
      const L=k.split(' ').length-1;
      const s0=chosen.find(c=>c.k===k)!.starts[0]!;
      let ph=''; for(let q=0;q<L;q++) ph+=toks[s0+q]!.s;
      if(back.includes(g)){ back=back.split(g).join(ph); changed=true; }
    }
    if(!changed) break;
  }
  const wire=tape+'\u00b6'+body;
  return {wire,exact:back===text,rules:chosen.length,
    saved:chosen.reduce((a,c)=>a+c.gain,0),
    wireTok:countTokens(wire,enc)};
}

for(const f of process.argv.slice(2)){
  const t=fs.readFileSync(f,'utf8');
  const raw=countTokens(t,enc);
  const p:any=polytroposEncode(t,enc);
  const dp:string=p.decoderPrompt; const contract=dp.slice(String(p.wire).length+1);
  const o=oracle(t);
  console.log(`${f.split('/').pop()!.padEnd(26)} raw=${String(raw).padStart(5)} polyWire=${String(countTokens(String(p.wire),enc)).padStart(5)} contract=${String(countTokens(contract,enc)).padStart(3)} | ORACLE rules=${String(o.rules).padStart(4)} wire=${String(o.wireTok).padStart(5)} saved=${String(o.saved).padStart(4)} exact=${o.exact} | oracleM=${o.wireTok+countTokens(contract,enc)} vs polyM=${p.messageTokens}`);
}
