import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { tagstackFrontier, tagstackEncode } from '../../src/lib/omega/tagstack';
const enc='o200k_base' as const;const T=(s:string)=>countTokens(s,enc);
Object.assign(process.env,{OMEGA_DET:'1',OMEGA_NO_MEMO:'1',OMEGA_ENGRAM:'0',OMEGA_OURA_MEMO:'0',OMEGA_NO_OROTHESIA:'1',OMEGA_SYNEDRIA:'1'});
const KEY='Qn m: next m lines each start with n > characters.';
function encQ(text:string){const lines=text.split('\n');const out:string[]=[];let hits=0;for(let i=0;i<lines.length;){const m=/^(>+)/.exec(lines[i]!);if(!m){out.push(lines[i++]!);continue;}const p=m[1]!;let j=i;while(j<lines.length&&lines[j]!.startsWith(p))j++;if(j-i>=3){out.push(`Q${p.length} ${j-i}`);for(let k=i;k<j;k++)out.push(lines[k]!.slice(p.length));hits+=j-i;i=j;}else out.push(lines[i++]!);}return {wire:KEY+'\n'+out.join('\n'),body:out.join('\n'),hits};}
function decQ(wire:string){const ls=wire.slice(wire.indexOf('\n')+1).split('\n');const r:string[]=[];for(let i=0;i<ls.length;){const m=/^Q(\d+) (\d+)$/.exec(ls[i]!);if(!m){r.push(ls[i++]!);continue;}const n=+m[1]!,c=+m[2]!;i++;for(let k=0;k<c;k++)r.push('>'.repeat(n)+ls[i++]!);}return r.join('\n');}
const paths=process.argv.slice(2).length?process.argv.slice(2):['bench/holdout-work/email-thread.txt'];
const rows:any[]=[];
for(const p of paths){const text=fs.readFileSync(p,'utf8');const q=encQ(text);const exact=decQ(q.wire)===text;const base=tagstackEncode(text,enc);const inner=tagstackFrontier(q.body,enc);const msg=KEY+'\n'+inner.message;const tokens=T(msg);const row={path:p,raw:T(text),base:base.messageTokens,hits:q.hits,exact,inner:inner.messageTokens,innerExact:inner.decoded===q.body,candidate:tokens,delta:tokens-base.messageTokens,key:T(KEY),bodyRaw:T(q.body),innerParent:inner.parentCodec};rows.push(row);console.log(JSON.stringify(row));}
fs.writeFileSync('bench/x117/receipts/probe-quote.json',JSON.stringify({rows},null,2)+'\n');
