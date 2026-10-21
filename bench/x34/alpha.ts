import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
const HEX='0123456789abcdef';
// candidate target alphabets (16 distinct chars each)
const cand:Record<string,string>={
  'freqEN'   :'etaoinsrhldcumfp'.slice(0,16),
  'freqEN2'  :'etaoinshrdlcumwfg'.slice(0,16),
  'lowerMix' :'thequickbrownfxjm'.slice(0,16),  // distinct letters from pangram
  'common'   :'thereisacomnpludf'.slice(0,16),
  'vowelish' :'aeioubcdfghjklmnp'.slice(0,16),
  'digits'   :'0123456789abcdef',
};
function distinctOk(s:string){ return new Set(s).size===s.length; }
for(const k of Object.keys(cand)) if(!distinctOk(cand[k])) console.log('BAD alphabet',k);
// build real hex payloads from the actual corpus
import fs from 'node:fs';
const files=['bench/holdout-ops/openstack-loghub-26.log','bench/holdout-mk/dump.sql','bench/holdout-ops/find-listing.txt'];
const hexRuns:string[]=[];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  for(const m of t.matchAll(/[0-9a-fA-F]{16,}/g)) hexRuns.push(m[0].toLowerCase());
}
const sample=hexRuns.slice(0,400);
const totalCh=sample.reduce((a,s)=>a+s.length,0);
const baseTok=sample.reduce((a,s)=>a+countTokens(s,enc),0);
console.log('hex runs:',sample.length,'chars:',totalCh,'baseline tokens:',baseTok,
  '=',(totalCh/baseTok).toFixed(2),'chars/token');
console.log('');
for(const name of Object.keys(cand)){
  const A=cand[name]; const map=new Map<string,string>();
  for(let i=0;i<16;i++) map.set(HEX[i],A[i]);
  const conv=(s:string)=>{let o='';for(const c of s)o+=map.get(c)??c;return o;};
  const tk=sample.reduce((a,s)=>a+countTokens(conv(s),enc),0);
  console.log(`  ${name.padEnd(9)} -> ${String(tk).padStart(5)} tok  (${(totalCh/tk).toFixed(2)} ch/tok)  delta vs base ${tk-baseTok>=0?'+':''}${tk-baseTok}  (${((tk-baseTok)/baseTok*100).toFixed(1)}%)`);
}
// what about base64 of the same bytes?
const toB64=(hex:string)=>Buffer.from(hex,'hex').toString('base64');
const b64Tok=sample.reduce((a,s)=>a+countTokens(toB64(s),enc),0);
const b64Ch=sample.reduce((a,s)=>a+toB64(s).length,0);
console.log(`  base64    -> ${String(b64Tok).padStart(5)} tok  (${(b64Ch/b64Tok).toFixed(2)} ch/tok)  delta ${b64Tok-baseTok}`);
