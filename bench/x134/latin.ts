import * as fs from 'node:fs';
import {countTokens} from '../../src/lib/omega/bpe';
import {glyphSetFor} from '../../src/lib/omega/euros';
const ct=(s:string)=>countTokens(s,'o200k_base');
const letters='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
for(const line of fs.readFileSync('bench/x134/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),M=a.message as string; if(!M.includes('§'))continue;
 const G=[...glyphSetFor(a.text,M)];if(!G.length)continue;
 const esc=['~','`','^','\\'].find(e=>!M.includes(e));if(!esc)continue;
 const map=new Map<string,string>();let bestN=ct(M),best='',rawN=bestN,record:any[]=[];const t=Date.now();
 function render(mp:Map<string,string>){const rev=new Set(mp.values());let b='';for(const c of M)b+=mp.get(c)??(rev.has(c)?esc+c:c);return `First substitute ${[...mp].map(([g,h])=>h+'='+g).join(',')}; ${esc} escapes next character. Then decode:\n`+b;}
 // permit negative intermediate steps; track best entire portfolio prefix.
 for(let pass=0;pass<10;pass++){
  let pick:any=null;
  for(const g of G){if(map.has(g))continue;for(const h of letters){if([...map.values()].includes(h))continue;
   const mp=new Map(map);mp.set(g,h);const m=render(mp),n=ct(m);
   if(!pick||n<pick.n)pick={g,h,m,n};
  }}
  if(!pick)break;map.set(pick.g,pick.h);record.push([pick.g,pick.h,pick.n]);
  if(pick.n<bestN){bestN=pick.n;best=pick.m;}
 }
 console.log(JSON.stringify({path:a.path,A:a.tokens,B:bestN,delta:bestN-a.tokens,ms:Date.now()-t,record}));
}
