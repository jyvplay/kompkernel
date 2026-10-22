import * as fs from 'node:fs';
import { anadiplosisEncode } from '@/lib/omega/anadiplosis';
const enc:any='o200k_base';
const SETS:Record<string,string>={
  'uc-freq':'ETAOINSRHL','lc-freq':'etaoinsrhl','lc-mid':'cdpfmgwbyv','uc-rare':'QXJKVWZBFG',
};
const dig='0123456789';
function mk(set:string){ const m=new Map<string,string>();
  for(let i=0;i<10;i++){m.set(dig[i],set[i]);m.set(set[i],dig[i]);} return m; }
function swap(t:string,m:Map<string,string>){ return t.replace(/[0-9a-zA-Z]/g,c=>m.get(c)??c); }
const CLAUSE_TOK = 30;   // estimated contract sentence for the swap
for(const p of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(p))continue;
  const t=fs.readFileSync(p,'utf8');
  const base:any=anadiplosisEncode(t,enc);
  const row:string[]=[];
  for(const [nm,set] of Object.entries(SETS)){
    const m=mk(set);
    const r:any=anadiplosisEncode(swap(t,m),enc);
    row.push(nm+':'+(r.messageTokens+CLAUSE_TOK-base.messageTokens));
  }
  console.log(p.split('/').pop()!.padEnd(26),'stack='+String(base.messageTokens).padStart(5),row.join('  '));
}
