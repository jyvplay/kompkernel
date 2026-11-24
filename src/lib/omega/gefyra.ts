/** X169 GEFYRA (bridge): marker-free gap insertion from two retained neighbors.
 * Experimental/unwired. Classical contextual rewrite ancestry, not a new
 * information-theory result or native-model verification. Unlike DIADOCHI,
 * no successor queue is consumed; unlike THESI, no positions are transmitted.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const GEFYRA_CAP=50000;
export const GEFYRA_KEY='Decode payload first. First line: JSON rows [left,right,middle]. Split remaining text on ASCII spaces retaining empty fields. Between each adjacent pair matching left,right insert middle as one extra field. Match only original fields, never inserted ones. Join with ASCII spaces; preserve all characters; print only.\n';
type Rule=[string,string,string];
function domain(s:string){if(s.length>GEFYRA_CAP||!isUtf8TransportStable(s))throw Error('GEFYRA domain');}
const pair=(a:string,b:string)=>JSON.stringify([a,b]);
function field(v:unknown):v is string{return typeof v==='string'&&!v.includes(' ');}
export function gefyraUndo(folded:string){
 domain(folded);const at=folded.indexOf('\n');if(at<0)throw Error('GEFYRA frame');const rows:unknown=JSON.parse(folded.slice(0,at));if(!Array.isArray(rows)||!rows.length||rows.length>64)throw Error('GEFYRA rows');
 const map=new Map<string,string>();for(const r of rows){if(!Array.isArray(r)||r.length!==3||!r.every(field))throw Error('GEFYRA row');const k=pair(r[0],r[1]);if(map.has(k))throw Error('GEFYRA duplicate');map.set(k,r[2]);}
 const body=folded.slice(at+1),a=body.split(' '),out:string[]=[];let units=body.length;
 for(let i=0;i<a.length;i++){out.push(a[i]);if(i+1<a.length){const middle=map.get(pair(a[i],a[i+1]));if(middle!==undefined){units+=1+middle.length;if(units>GEFYRA_CAP)throw Error('GEFYRA expansion');out.push(middle);}}}
 const result=out.join(' ');domain(result);return result;
}
/** Bounded frequency screen, not optimal grammar induction. Trial groups may
 * interact: exact inversion rejects unintended newly-adjacent trigger pairs. */
export function gefyraPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);const a=source.split(' ');if(a.length<5)return [];const counts=new Map<string,{rule:Rule;n:number;first:number}>();
 for(let i=0;i+2<a.length;i++){const rule:Rule=[a[i],a[i+2],a[i+1]];if(rule.some(w=>w.length>100))continue;const key=JSON.stringify(rule),r=counts.get(key);if(r)r.n++;else counts.set(key,{rule,n:1,first:i});}
 const ranked=[...counts.values()].filter(r=>r.n>=3).sort((a,b)=>b.n*(b.rule[2].length+1)-a.n*(a.rule[2].length+1)||a.first-b.first).slice(0,32);
 const groups:Rule[][]=ranked.slice(0,8).map(r=>[r.rule]);for(const n of [2,4,8,16,32]){const seen=new Set<string>();const rs=ranked.slice(0,n).flatMap(r=>{const k=pair(r.rule[0],r.rule[1]);if(seen.has(k))return [];seen.add(k);return [r.rule];});if(rs.length>1)groups.push(rs);}
 const plans:{rules:number;sites:number;folded:string;message:string;tokens:number}[]=[];
 for(const rules of groups){const map=new Map(rules.map(r=>[pair(r[0],r[1]),r[2]])),out:string[]=[];let sites=0;
  for(let i=0;i<a.length;i++){out.push(a[i]);if(i+2<a.length&&map.get(pair(a[i],a[i+2]))===a[i+1]){i++;sites++;}}
  if(!sites)continue;const folded=JSON.stringify(rules)+'\n'+out.join(' ');if(folded.length>GEFYRA_CAP||plans.some(p=>p.folded===folded))continue;
  try{if(gefyraUndo(folded)!==source)continue;}catch{continue;}
  const message=GEFYRA_KEY+folded;plans.push({rules:rules.length,sites,folded,message,tokens:countTokens(message,enc)});
 }return plans.sort((a,b)=>a.tokens-b.tokens||a.rules-b.rules);
}
export function gefyraRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>GEFYRA_CAP+1000||!isUtf8TransportStable(message)||!message.startsWith(GEFYRA_KEY))throw Error('GEFYRA wire');return gefyraUndo(parent(message.slice(GEFYRA_KEY.length)));}
export function gefyraFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(incumbent.length>GEFYRA_CAP+1000||!isUtf8TransportStable(incumbent)||incumbent.startsWith(GEFYRA_KEY)||readIncumbent(incumbent)!==source)throw Error('GEFYRA incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const plans=gefyraPlans(source,enc);
 const admit=(message:string,read:(s:string)=>string)=>{try{if(message.length>GEFYRA_CAP+1000||!isUtf8TransportStable(message))return;const tokens=countTokens(message,enc);if(tokens<best.tokens&&gefyraRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* verified fallback */}};
 for(const p of plans)admit(p.message,s=>s);if(plans.length){best.parentCalls++;try{admit(GEFYRA_KEY+encodeParent(plans[0].folded),readParent);}catch{/* verified fallback */}}return best;
}
