import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironParseTape, chironInScript } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const SCRIPTS:any=(()=>{try{return require('@/lib/omega/chiron').CHIRON_SCRIPTS}catch(e){return []}})();
function scriptOf(ch:string){ const cp=ch.codePointAt(0); if(cp===undefined)return null;
  for(const s of SCRIPTS) if((chironInScript as any)(s,cp)) return s; return null; }
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w:String=r.wire;
  const cut=w.indexOf(CHIRON_SEP);
  if(cut<0){ console.log(f.split('/').pop()!.padEnd(26),'no rules'); continue; }
  const gloss=w.slice(CHIRON_START.length,cut);
  const tape=w.slice(cut+1);
  const sc=scriptOf(gloss[0]||'');
  const parsed=sc?(chironParseTape as any)(gloss,sc) as any[]:null;
  if(!parsed){ console.log(f.split('/').pop()!.padEnd(26),'parse failed'); continue; }
  const glyphs=new Set<string>(); for(const p of parsed) glyphs.add(p.glyph);
  let glyphCh=0,textCh=0;
  for(const c of tape){ if(glyphs.has(c)) glyphCh++; else textCh++; }
  const tapeTok=countTokens(tape,enc);
  const lit=tape.split('').filter(c=>!glyphs.has(c)).join('');
  const litTok=countTokens(lit,enc);
  // total chars the phrases would have occupied
  let phraseCh=0; for(const p of parsed) phraseCh+=p.raw.length;
  console.log(f.split('/').pop()!.padEnd(26),
    'rules',String(parsed.length).padStart(3),
    'tapeCh',String(tape.length).padStart(5),'tapeTok',String(tapeTok).padStart(4),'cpt',(tape.length/tapeTok).toFixed(2),
    '| glyphCh',String(glyphCh).padStart(4),'textCh',String(textCh).padStart(5),
    '| litTok',String(litTok).padStart(4),'litCpt',(textCh/Math.max(1,litTok)).toFixed(2),
    '=> glyphTok',String(tapeTok-litTok).padStart(4),
    'perGlyphTok',(glyphCh?((tapeTok-litTok)/glyphCh):0).toFixed(2));
}
