import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';
const rows = fs.readFileSync('bench/x120/receipts/ab-messages.jsonl','utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
function scriptOf(cp:number){for(const s of CHIRON_SCRIPTS) if(chironInScript(s,cp)) return s; return null;}
for (const r of rows) {
  if (!/ps-aux-real|node-help/.test(r['path'])) continue;
  const m:string=r['message']; const s0=m.indexOf(CHIRON_START), p0=m.indexOf(CHIRON_SEP,s0+1);
  const tape=m.slice(s0+1,p0); const sc=scriptOf(tape.codePointAt(0)!)!;
  const inS=(c:string)=>chironInScript(sc,c.codePointAt(0)!);
  const used=new Set<string>(); let i=0; const out:string[]=[];
  while(i<tape.length){const g=tape[i]; if(!inS(g)||used.has(g))break; used.add(g); let j=i+1;
    while(j<tape.length && !(inS(tape[j])&&!used.has(tape[j]))) j++;
    const v=tape.slice(i+1,j); out.push(`${g}[${countTokens(v,'o200k_base')}]=${JSON.stringify(v)}`); i=j;}
  console.log('###', r['path'], 'rules', out.length);
  console.log(out.join('  '));
  console.log();
}
