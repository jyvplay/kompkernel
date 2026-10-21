import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { chironParseTape } from '@/lib/omega/chiron';
import * as CH from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const f=process.env.F||'';
const text=fs.readFileSync(f,'utf8');
const r:any=oikonomiaEncode(text,enc);
const w:string=r.wire; const cut=w.indexOf('\u00b6',1);
const tape0=w.slice(1,cut);
const cp0=tape0.codePointAt(0)!;
let script:any=null;
for(const s of (CH as any).CHIRON_SCRIPTS){ if((CH as any).chironInScript(s,cp0)){ script=s; break; } }
const rules=chironParseTape(tape0,script)!;
const glyphs=rules.map(x=>x.glyph);
console.log('lane',f.split('/').pop(),'script',script.name,'rules',rules.length);
let shown=0;
for(let i=0;i<rules.length && shown<5;i++){
  const deps=glyphs.map((g,j)=>j!==i&&rules[i].raw.includes(g)?j:-1).filter(j=>j>=0);
  if(deps.length){ shown++;
    console.log(`  rule[${i}] glyph=${JSON.stringify(rules[i].glyph)} deps=${JSON.stringify(deps)}`);
    console.log(`      raw=${JSON.stringify(rules[i].raw.slice(0,90))}`);
  }
}
const nDep=rules.filter((x,i)=>glyphs.some((g,j)=>j!==i&&x.raw.includes(g))).length;
console.log('  total with deps:',nDep);
