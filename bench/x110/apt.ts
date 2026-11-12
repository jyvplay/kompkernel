/**
 * X110 — WHERE DO APOGRAPHE'S TOKENS GO?
 * Dump the transformed text apographe feeds its parent, and tokenise it, so the
 * residue is visible instead of inferred.
 */
import * as fs from 'node:fs';
import { apographeEncode } from '../../src/lib/omega/apographe';
import { tokenStrings, countTokens } from '../../src/lib/omega/bpe';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const p=process.argv[2]!;
const text=fs.readFileSync(p,'utf8');
const r:any=apographeEncode(text,enc);
console.log('raw',countTokens(text,enc),'apographe M',r.messageTokens,'exact',r.decoded===text);
console.log('notes:',String(r.notes??'').slice(0,300));
const tr:any=(r as any).text ?? (r as any).transformed;
if(typeof tr==='string' && tr!==text){
  console.log('\n=== TRANSFORMED ('+countTokens(tr,enc)+' tok) ===');
  console.log(JSON.stringify(tr.slice(0,1200)));
  const toks=tokenStrings(tr,enc);
  const freq=new Map<string,number>();
  for(const t of toks) freq.set(t.s,(freq.get(t.s)??0)+1);
  const top=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40);
  console.log('\n=== TOP TOKENS ('+toks.length+' total, '+freq.size+' distinct) ===');
  console.log(top.map(([s,n])=>JSON.stringify(s)+'x'+n).join(' '));
} else { console.log('\n(no transform exposed; keys: '+Object.keys(r).join(',')+')'); }
