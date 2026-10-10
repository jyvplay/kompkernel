/** NEW ATTACK AIMED AT THE PATCH (protocol I): the gate must admit every
 *  document where the transpose actually wins, and stay cheap elsewhere. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { anastropheGate, anastropheEncode, longestDuplicateRun } from '../src/lib/omega/anastrophe';
import { plinthosEncode, plinthosEncodeText } from '../src/lib/omega/plinthos';
import { metatronEncode } from '../src/lib/omega/metatron';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
let checks=0,fails=0;
const ok=(c:boolean,w:string,x='')=>{checks++; if(!c){fails++; console.log('  FAIL '+w+(x?'  '+x:''));}};
const files:Array<[string,string]>=[];
for(const d of ['bench/holdout-tab','bench/holdout-tbl','bench/holdout','bench/holdout-mk','bench/holdout-work'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length>300&&t.length<16000) files.push([d.split('/').pop()!.replace('holdout-','')+'/'+f,t]);}
console.log('== the patched gate must not reject a winner ==');
let admitted=0;
for(const [n,t] of files){
  const g=anastropheGate(t);
  if(g.admitted) admitted++;
  let inc:any; try{const r=metatronEncode(t,ENC,{budgetMs:500}); if(r.decoded===t) inc=r;}catch{}
  const pl=plinthosEncode(t,ENC,{maxConfigs:2,configBudgetMs:40,incumbent:inc});
  const an=anastropheEncode(t,ENC,{maxConfigs:2,configBudgetMs:40,armBudgetMs:2500,incumbent:inc});
  ok(an.decoded===t,`exact ${n}`);
  ok(an.messageTokens<=T(t),`never-worse ${n}`);
  // the key property: if the transpose family wins, the gate must have admitted it
  if(pl.transposed && pl.messageTokens < an.messageTokens)
    ok(false,`GATE REJECTED A WINNER on ${n}`,`plinthos ${pl.messageTokens} < anastrophe ${an.messageTokens}`);
  console.log(`${n.padEnd(26)} gate=${g.admitted?'Y':'n'} dup=${g.dupColumn?'Y':'n'} run=${String(g.bestRun).padStart(5)} PLI ${String(pl.messageTokens).padStart(5)} ANA ${String(an.messageTokens).padStart(5)}`);
}
console.log('== gate properties ==');
ok(longestDuplicateRun('')===0,'empty -> 0');
ok(longestDuplicateRun('a\nb\nc')===0,'no dupes -> 0');
ok(longestDuplicateRun('abc\nxyz\nabc\nxyz')>=8,'duplicate pair found',String(longestDuplicateRun('abc\nxyz\nabc\nxyz')));
for(const s of ['','x','\n','\n\n\n','a'.repeat(5000),'💡\n💡\n','\u0000\n\u0000\n'])
  { try{ longestDuplicateRun(s); anastropheGate(s); ok(true,'gate survives '+JSON.stringify(s.slice(0,12))); }
    catch(e){ ok(false,'gate throws on '+JSON.stringify(s.slice(0,12)),String(e).slice(0,60)); } }
console.log(`\nadmitted ${admitted}/${files.length}   checks=${checks} failures=${fails}`);
