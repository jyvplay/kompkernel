/** X134 follow-up: jointly price TWO escaped Latin aliases, not sequential admission.
 * This is an experiment, not a claimed new compression primitive.
 */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {countTokens} from '../../src/lib/omega/bpe';
import {CHIRON_SCRIPTS,chironInScript,chironParseTape} from '../../src/lib/omega/chiron';
const ct=(s:string)=>countTokens(s,'o200k_base');
for(const l of fs.readFileSync('bench/x135/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(l),m=a.message as string,at=m.indexOf('§'),end=m.indexOf('¶',at);if(at<0||end<0)continue;
 const tape=m.slice(at+1,end),script=CHIRON_SCRIPTS.find(s=>tape.length&&chironInScript(s,tape.codePointAt(0)!)),rules=script?chironParseTape(tape,script):null;if(!rules)continue;
 const esc=['~','`','^','\\'].find(s=>!m.includes(s));if(!esc)continue;
 const render=(pairs:[string,string][])=>{
  const map=new Map(pairs),ids=new Set(pairs.map(p=>p[1]));let wire='';
  for(const c of m)wire+=map.get(c)??(ids.has(c)?esc+c:c);
  const key=`First substitute ${pairs.map(([g,h])=>h+'='+g).join(',')}; ${esc} escapes next character. Then decode:\n`;
  return {message:key+wire,wire};
 };
 const t=Date.now(),ranked:any[]=[];
 for(const r of rules)for(const h of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'){
  const p:[string,string]=[r.glyph,h];ranked.push({p,n:ct(render([p]).message)});
 }
 ranked.sort((a,b)=>a.n-b.n);const shortlist=ranked.slice(0,96);let probes=0,best=a.tokens,pick:any=null;
 for(let i=0;i<shortlist.length;i++)for(let j=i+1;j<shortlist.length;j++){
  const p=shortlist[i].p as [string,string],q=shortlist[j].p as [string,string];if(p[0]===q[0]||p[1]===q[1])continue;
  const {message,wire}=render([p,q]);probes++;
  // Independent inverse on every proposed payload, never on the source.
  const inv=new Map([[p[1],p[0]],[q[1],q[0]]]);let decoded='';
  for(let k=0;k<wire.length;k++){const c=wire[k];decoded+=c===esc?wire[++k]:(inv.get(c)??c);}
  assert.equal(decoded,m);
  const n=ct(message);if(n<best){best=n;pick=[p,q];}
 }
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:best,delta:best-a.tokens,probes,ms:Date.now()-t,pick}));
}
