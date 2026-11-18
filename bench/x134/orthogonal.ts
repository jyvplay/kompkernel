/** Negative controls: invertible alternative representations, full instruction tax.
 * These are experiments, not novelty claims or decoder-behaviour certificates.
 */
import * as fs from 'node:fs';
import {countTokens} from '../../src/lib/omega/bpe';
const ct=(s:string)=>countTokens(s,'o200k_base');
const rev=(s:string)=>[...s].reverse().join('');
for(const line of fs.readFileSync('bench/x134/receipts/frontier.jsonl','utf8').trim().split('\n')){
 const a=JSON.parse(line),m=a.message as string;
 const reverse='Reverse the following characters, then decode:\n'+rev(m);
 const cases:number[]=[];let lower='';let i=0;
 for(const c of m){if(/[A-Z]/.test(c))cases.push(i);lower+=/[A-Z]/.test(c)?c.toLowerCase():c;i++;}
 const caseMessage='Uppercase characters at zero-based positions '+cases.join(',')+'; then decode:\n'+lower;
 const restored=[...lower].map((c,i)=>cases.includes(i)?c.toUpperCase():c).join('');
 // Whole-line sorting + explicit inverse permutation; no source-order guess.
 const lines=m.split('\n'),sorted=lines.map((s,i)=>({s,i})).sort((a,b)=>a.s<b.s?-1:a.s>b.s?1:a.i-b.i);
 const order=Array.from({length:lines.length},(_,i)=>sorted.findIndex(r=>r.i===i));
 const sortMessage='Restore line order (zero-based): '+order.join(',')+'. Then decode:\n'+sorted.map(r=>r.s).join('\n');
 console.log(JSON.stringify({path:a.path,A:a.tokens,reverse:ct(reverse),casePlane:ct(caseMessage),linePermutation:ct(sortMessage),exactReverse:rev(rev(m))===m,exactCase:restored===m,exactPermutation:order.map(i=>sorted[i].s).join('\n')===m}));
}
