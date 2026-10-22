import fs from 'node:fs';
import { syncopeEncode, syncopeRoundTrip } from '@/lib/omega/syncope';
import { oikonomiaDecode } from '@/lib/omega/oikonomia';
import { symplokeDecode } from '@/lib/omega/symploke';
import { countTokens } from '@/lib/omega/bpe';
import { chironDecode, CHIRON_START, CHIRON_SEP, chironInScript, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const text=fs.readFileSync(f,'utf8');
  const r:any=syncopeEncode(text,enc);
  const wire=String(r.wire);
  // 1) does the UNMODIFIED wire round-trip via this path?
  let a='',b='';
  try{ a=oikonomiaDecode(wire,{stats:r.stats,order:r.order,undo:r.parent==='identity'?(w:string)=>w:chironDecode}); }catch(e){a='ERR';}
  const okA = a===text;
  // 2) now remap glyphs -> polyglot (identity order) and retest
  const inAny=(cp:number)=>CHIRON_SCRIPTS.some(s=>chironInScript(s,cp));
  const glyphs:string[]=[]; const gset=new Set<string>();
  for(const c of wire) if(inAny(c.codePointAt(0)!)&&!gset.has(c)){gset.add(c);glyphs.push(c);}
  const POLY=CHIRON_SCRIPTS.find(s=>s.name==='polyglot')!;
  const pool:string[]=[];
  for(const [lo,hi] of POLY.ranges!){ for(let cp=lo;cp<hi&&pool.length<glyphs.length+5;cp++) pool.push(String.fromCodePoint(cp)); }
  const map=new Map<string,string>(); glyphs.forEach((g,i)=>map.set(g,pool[i]));
  let nw=''; for(const c of wire) nw+= map.get(c) ?? c;
  try{ b=oikonomiaDecode(nw,{stats:r.stats,order:r.order,undo:r.parent==='identity'?(w:string)=>w:chironDecode}); }catch(e){b='ERR';}
  console.log(f.split('/').pop()!.padEnd(24),'K',String(glyphs.length).padStart(3),
    '| parent',String(r.parent).padEnd(11),'winner',String(r.winner).padEnd(8),
    '| unmod',okA?'EXACT':'FAIL','| remapped',b===text?'EXACT':'FAIL',
    '| toks',String(countTokens(wire,enc)).padStart(5),'->',String(countTokens(nw,enc)).padStart(5));
}
