import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const T=(s:string,e:EncodingName)=>countTokens(s,e);
const PATS: Record<string,RegExp> = {
  cl100k: /'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu,
  o200k: /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n\/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu,
};
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-mk','bench/holdout-ops','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<60000) files.push([d.split('/').pop()!+'/'+f,t]);}
for(const enc of ['o200k_base','cl100k_base'] as EncodingName[]){
  for(const [pn,re] of Object.entries(PATS)){
    let bad=0, recon=0, worst='';
    const memo=new Map<string,number>();
    for(const [n,t] of files){
      re.lastIndex=0; const cs=t.match(re) ?? [];
      if(cs.join('')!==t){recon++;continue;}
      let s=0; for(const c of cs){const k=enc+'\u0001'+c; let v=memo.get(k); if(v===undefined){v=T(c,enc);memo.set(k,v);} s+=v;}
      if(s!==T(t,enc)){bad++; if(!worst) worst=`${n} (${s} vs ${T(t,enc)})`;}
    }
    console.log(`${enc.padEnd(12)} pattern=${pn.padEnd(7)} exact ${files.length-bad-recon}/${files.length}  reconFail=${recon}  firstMismatch=${worst||'-'}`);
  }
}
