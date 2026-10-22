import fs from 'node:fs';
import { syncopeEncode } from '@/lib/omega/syncope';
import { chironDecode, chironParseTape, CHIRON_START, CHIRON_SEP, chironInScript, CHIRON_SCRIPTS } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const POLY=CHIRON_SCRIPTS.find(s=>s.name==='polyglot')!;
const f=process.env.L||'bench/holdout-tab/vix-daily-1990.csv';
const text=fs.readFileSync(f,'utf8');
const r:any=syncopeEncode(text,enc);
const wire=String(r.wire);
console.log('wire starts with §:',wire.startsWith(CHIRON_START),'| len',wire.length);
const cut=wire.indexOf(CHIRON_SEP,CHIRON_START.length);
const gloss=wire.slice(CHIRON_START.length,cut);
console.log('gloss len',gloss.length,'| first 60:',JSON.stringify(gloss.slice(0,60)));
// which script is gloss[0]?
for(const s of CHIRON_SCRIPTS) if(chironInScript(s,gloss.codePointAt(0)!)) console.log('scriptOf(gloss[0]) =',s.name);
// rebuild a trivial identity mapping but into polyglot pool, then parse
const inAny=(cp:number)=>CHIRON_SCRIPTS.some(s=>chironInScript(s,cp));
const glyphs:string[]=[]; const gset=new Set<string>();
for(const c of wire) if(inAny(c.codePointAt(0)!)&&!gset.has(c)){gset.add(c);glyphs.push(c);}
console.log('K glyphs',glyphs.length,'| sample',JSON.stringify(glyphs.slice(0,6)));
// pick K polyglot chars
const pool:string[]=[];
for(const [a,b] of POLY.ranges!){ for(let cp=a;cp<b&&pool.length<glyphs.length+5;cp++) pool.push(String.fromCodePoint(cp)); }
const map=new Map<string,string>(); glyphs.forEach((g,i)=>map.set(g,pool[i]));
let nw=''; for(const c of wire) nw+= map.get(c) ?? c;
const ncut=nw.indexOf(CHIRON_SEP,CHIRON_START.length);
const ngloss=nw.slice(CHIRON_START.length,ncut);
let nmatch='';
for(const s of CHIRON_SCRIPTS) if(chironInScript(s,ngloss.codePointAt(0)!)) nmatch=s.name;
console.log('new gloss[0] script ->',nmatch);
const parsed=chironParseTape(ngloss,POLY);
console.log('chironParseTape ->',parsed===null?'NULL':(parsed.length+' rules'));
if(parsed) console.log('  first rule:',JSON.stringify(parsed[0]).slice(0,120));
const dec=chironDecode(nw);
console.log('chironDecode == original?',dec===text,'| out len',dec.length,'orig',text.length);
if(dec!==text){ let i=0; while(i<Math.min(dec.length,text.length)&&dec[i]===text[i])i++;
  console.log('first diff at',i,'| orig:',JSON.stringify(text.slice(i-25,i+45)));
  console.log('              | got :',JSON.stringify(dec.slice(i-25,i+45))); }
