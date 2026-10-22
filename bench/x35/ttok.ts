import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironParseTape, chironInScript } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const SCRIPTS:any=require('@/lib/omega/chiron').CHIRON_SCRIPTS;
function scriptOf(ch:string){const cp=ch.codePointAt(0);if(cp===undefined)return null;
  for(const s of SCRIPTS) if((chironInScript as any)(s,cp)) return s; return null;}
// crude BPE-ish: split tape into token-like pieces by re-tokenizing cumulative prefixes
function toks(s:string,enc:any):string[]{
  // find token boundaries by binary-searching counts on prefixes (O(n log n) counts)
  const out:string[]=[]; let i=0;
  while(i<s.length){
    let lo=1,hi=Math.min(32,s.length-i),best=1;
    // largest k such that countTokens(s.slice(i,i+k)) == 1
    while(lo<=hi){ const mid=(lo+hi)>>1;
      if(countTokens(s.slice(i,i+mid),enc)===1){best=mid;lo=mid+1;} else hi=mid-1; }
    out.push(s.slice(i,i+best)); i+=best;
  }
  return out;
}
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w=String(r.wire); const cut=w.indexOf(CHIRON_SEP);
  const gloss=w.slice(CHIRON_START.length,cut); const tape=w.slice(cut+1);
  const sc=scriptOf(gloss[0]||''); const rules=sc?(chironParseTape(gloss,sc) as any[]):[];
  const glyphs=new Set<string>((rules||[]).map((x:any)=>x.glyph));
  const tk=toks(tape,enc);
  const cls={glyphRun:0,word:0,rare:0,punct:0,digit:0,space:0,other:0};
  for(const x of tk){
    if([...x].every(c=>glyphs.has(c))) cls.glyphRun++;
    else if(/^[\s]+$/.test(x)) cls.space++;
    else if(/^[0-9]+$/.test(x)) cls.digit++;
    else if(/^[^A-Za-z0-9]+$/.test(x)) cls.punct++;
    else if(/[A-Za-z]/.test(x)) cls.word++;
    else cls.other++;
  }
  const tot=tk.length;
  console.log(f.split('/').pop()!.padEnd(24),'tapeTok',String(tot).padStart(4),
    Object.entries(cls).filter(([,v])=>v>0).map(([k,v])=>`${k}:${v}(${(v/tot*100).toFixed(0)}%)`).join(' '));
}
