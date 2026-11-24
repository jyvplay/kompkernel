/** X170 KYKLOS: independent cyclic dictionaries over interleaved word events.
 * Experimental/unwired. Finite-state sequential transduction ancestry; not an
 * AI-native discovery or verified native-model behavior. Unlike a FIFO codec,
 * each family reuses a finite cycle indefinitely; no occurrence-choice tape.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const KYKLOS_CAP=50000;
export const KYKLOS_KEY='Decode payload first. First line: JSON rows [marker,[words]]. Scan remaining text for maximal ASCII letter runs. Replace each marker with the next word in its row, cycling from the first; each row has its own counter. Literal words do not advance counters. Do not rescan replacements. Preserve all other characters; print only.\n';
type Rule=[string,string[]];
function domain(s:string){if(s.length>KYKLOS_CAP||!isUtf8TransportStable(s))throw Error('KYKLOS domain');}
export function kyklosUndo(folded:string){
 domain(folded);const at=folded.indexOf('\n');if(at<0)throw Error('KYKLOS frame');const rows:unknown=JSON.parse(folded.slice(0,at));if(!Array.isArray(rows)||!rows.length||rows.length>8)throw Error('KYKLOS rows');
 const rules=new Map<string,{words:string[];at:number}>();
 for(const r of rows){if(!Array.isArray(r)||r.length!==2||typeof r[0]!=='string'||! /^[A-Za-z]+$/.test(r[0])||rules.has(r[0])||!Array.isArray(r[1])||r[1].length<2||r[1].length>4||!r[1].every((w:unknown)=>typeof w==='string'&&/^[A-Za-z]+$/.test(w)))throw Error('KYKLOS rule');rules.set(r[0],{words:r[1],at:0});}
 const body=folded.slice(at+1);let units=body.length;
 const result=body.replace(/[A-Za-z]+/g,w=>{const r=rules.get(w);if(!r)return w;const next=r.words[r.at++%r.words.length];units+=next.length-w.length;if(units>KYKLOS_CAP)throw Error('KYKLOS expansion');return next;});domain(result);return result;
}
/** Screen at most 24 frequent words, all pairs and first-occurrence triples.
 * Greedily match each cycle as a subsequence; exceptions stay literal and do
 * NOT advance the decoder cursor. Groups are greedily disjoint; full prices,
 * choose among singles and cumulative groups. No global optimality claim. */
export function kyklosPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);const words=source.match(/[A-Za-z]+/g)??[],freq=new Map<string,number>();for(const w of words)freq.set(w,(freq.get(w)??0)+1);
 const top=[...freq].filter(([w,n])=>n>=3&&w.length<=100).sort((a,b)=>b[1]*b[0].length-a[1]*a[0].length).slice(0,24).map(([w])=>w);
 const families:{cycle:string[];score:number}[]=[];
 for(let i=0;i<top.length;i++)for(let j=i+1;j<top.length;j++){
  const sets=[[top[i],top[j]]];if(j+1<top.length)sets.push([top[i],top[j],top[j+1]]);
  for(const members of sets){const set=new Set(members),events=words.filter(w=>set.has(w)),cycle=[...new Set(events)];let cursor=0,score=0;
   for(const w of events)if(w===cycle[cursor%cycle.length]){score+=w.length-1;cursor++;}
   if(cursor<3*cycle.length)continue;
   families.push({cycle,score:score-cycle.join('').length});}
 }
 families.sort((a,b)=>b.score-a.score);const markers=['Q','Z','X','J','V','K','W','Y'].filter(w=>!freq.has(w));if(!markers.length)return [];
 const groups:Rule[][]=families.slice(0,8).map(f=>[[markers[0],f.cycle]]);const used=new Set<string>(),group:Rule[]=[];
 for(const f of families){if(group.length>=markers.length||f.cycle.some(w=>used.has(w)))continue;f.cycle.forEach(w=>used.add(w));group.push([markers[group.length],f.cycle]);if(group.length>1)groups.push(group.map(([m,c])=>[m,c]));}
 const plans:{rules:number;folded:string;message:string;tokens:number}[]=[];
 for(const rules of groups){const replace=new Map<string,{marker:string;cycle:string[];at:number}>();for(const [marker,cycle] of rules){const state={marker,cycle,at:0};for(const w of cycle)replace.set(w,state);}const folded=JSON.stringify(rules)+'\n'+source.replace(/[A-Za-z]+/g,w=>{const r=replace.get(w);if(!r||w!==r.cycle[r.at%r.cycle.length])return w;r.at++;return r.marker;});if(folded.length>KYKLOS_CAP||plans.some(p=>p.folded===folded))continue;
  if(kyklosUndo(folded)!==source)throw Error('KYKLOS planner inverse');const message=KYKLOS_KEY+folded;plans.push({rules:rules.length,folded,message,tokens:countTokens(message,enc)});
 }return plans.sort((a,b)=>a.tokens-b.tokens||a.rules-b.rules);
}
export function kyklosRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>KYKLOS_CAP+1000||!isUtf8TransportStable(message)||!message.startsWith(KYKLOS_KEY))throw Error('KYKLOS wire');return kyklosUndo(parent(message.slice(KYKLOS_KEY.length)));}
export function kyklosFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(incumbent.length>KYKLOS_CAP+1000||!isUtf8TransportStable(incumbent)||incumbent.startsWith(KYKLOS_KEY)||readIncumbent(incumbent)!==source)throw Error('KYKLOS incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const plans=kyklosPlans(source,enc);
 const admit=(message:string,read:(s:string)=>string)=>{try{if(message.length>KYKLOS_CAP+1000)return;const tokens=countTokens(message,enc);if(tokens<best.tokens&&kyklosRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* exact fallback */}};
 for(const p of plans)admit(p.message,s=>s);if(plans.length){best.parentCalls++;try{admit(KYKLOS_KEY+encodeParent(plans[0].folded),readParent);}catch{/* exact fallback */}}return best;
}
