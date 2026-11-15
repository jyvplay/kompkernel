import * as fs from 'node:fs';
import { tokenStrings } from '../../src/lib/omega/bpe';
const RE = /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
void tokenStrings;
const msgs = fs.readFileSync('bench/x119/receipts/final-frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l).message as string);
const hist = new Map<number,number>(); let total=0, chars=0;
for (const m of msgs) { for (const c of m.match(RE) ?? []) { hist.set(c.length,(hist.get(c.length)??0)+1); total++; chars+=c.length; } }
let le1=0,le2=0,le3=0,le4=0;
for (const [l,n] of hist) { if(l<=1)le1+=n; if(l<=2)le2+=n; if(l<=3)le3+=n; if(l<=4)le4+=n; }
console.log('chunks',total,'chars',chars,'avg',(chars/total).toFixed(2));
console.log(`<=1 ${(100*le1/total).toFixed(1)}%  <=2 ${(100*le2/total).toFixed(1)}%  <=3 ${(100*le3/total).toFixed(1)}%  <=4 ${(100*le4/total).toFixed(1)}%`);
console.log([...hist.entries()].sort((a,b)=>a[0]-b[0]).slice(0,12).map(([l,n])=>`${l}:${n}`).join(' '));
fs.writeFileSync('bench/x120/receipts/chunk-dist.json',JSON.stringify({total,chars,le1,le2,le3,le4,hist:[...hist.entries()].sort((a,b)=>a[0]-b[0])},null,2)+'\n');
