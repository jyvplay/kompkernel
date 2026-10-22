import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_SEP, chironParseTape } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const t0=(s:string)=>countTokens(s,enc);
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w=String(r.wire); const cut=w.indexOf(CHIRON_SEP);
  const tape=w.slice(cut+1);
  // glyph set = non-ascii chars in tape
  const isG=(c:string)=>c.codePointAt(0)!>127;
  // walk tape, split into maximal glyph runs and literal runs
  const segs:Array<{g:boolean;s:string}>=[];
  let i=0;
  while(i<tape.length){
    const g=isG(tape[i]); let j=i;
    while(j<tape.length && isG(tape[j])===g) j++;
    segs.push({g,s:tape.slice(i,j)}); i=j;
  }
  let glyphCh=0,glyphTok=0,nGlyphRuns=0,litCh=0,litTok=0,nLitRuns=0;
  for(const s of segs){
    if(s.g){glyphCh+=s.s.length;glyphTok+=t0(s.s);nGlyphRuns++;}
    else {litCh+=s.s.length;litTok+=t0(s.s);nLitRuns++;}
  }
  const tapeTok=t0(tape);
  // ceiling: every glyph run costs exactly 1 token
  const ceiling=tapeTok-glyphTok+nGlyphRuns;
  console.log(f.split('/').pop()!.padEnd(24),'tapeTok',String(tapeTok).padStart(5),
    '| glyph',`${nGlyphRuns}runs/${glyphCh}ch/${glyphTok}tok`,
    '| lit',`${nLitRuns}runs/${litCh}ch/${litTok}tok`,
    '| glyphTok%',(100*glyphTok/tapeTok).toFixed(0)+'%',
    '| merge ceiling save',String(glyphTok-nGlyphRuns).padStart(4),
    `(${((glyphTok-nGlyphRuns)/tapeTok*100).toFixed(1)}% of tape)`);
}
