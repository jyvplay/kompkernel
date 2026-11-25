/** X180 APOUSIA: deterministic-context omission, experimental/unwired.
 * A finite-state prediction/antidictionary-related construction, not a claim of
 * new mathematics or novelty against all finite-context codecs (see DIADOCHI).
 * Transmitted rules determine omitted fields without occurrence markers.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
const CAP=50000;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('APOUSIA domain');}
function width(k:number){if(![1,2,3].includes(k))throw Error('APOUSIA width');}
function field(v:unknown):v is string{return typeof v==='string'&&!v.includes(' ')&&isUtf8TransportStable(v);}
export function apousiaKey(k:number){width(k);return `Decode payload first. JSON [field count,array of [context array,next field] rules,residual string]. Split residual on ASCII spaces retaining empty fields. Build output left to right until field count: if its last ${k} fields match a rule context, append that rule's next field WITHOUT consuming residual; otherwise consume the next residual field. All residual fields must be consumed. Join output with single ASCII spaces, retaining empty fields and every other character; print only.\n`;}
export function apousiaUndo(folded:string,k:number){width(k);if(folded.length>200000||!isUtf8TransportStable(folded))throw Error('APOUSIA frame size');const v:unknown=JSON.parse(folded);
 if(!Array.isArray(v)||v.length!==3||!Number.isInteger(v[0])||v[0]<1||v[0]>50001||!Array.isArray(v[1])||v[1].length>128||typeof v[2]!=='string')throw Error('APOUSIA frame');
 const rules=new Map<string,string>();for(const row of v[1]){if(!Array.isArray(row)||row.length!==2||!Array.isArray(row[0])||row[0].length!==k||!row[0].every(field)||!field(row[1]))throw Error('APOUSIA rule');const key=JSON.stringify(row[0]);if(rules.has(key))throw Error('APOUSIA duplicate context');rules.set(key,row[1]);}
 const residue=v[2].split(' '),out:string[]=[];let at=0,units=0;for(let i=0;i<v[0];i++){const forced=i>=k?rules.get(JSON.stringify(out.slice(-k))):undefined;let next:string;if(forced!==undefined)next=forced;else{if(at>=residue.length)throw Error('APOUSIA residual underflow');next=residue[at++];}units+=next.length+(i?1:0);if(units>CAP)throw Error('APOUSIA expansion');out.push(next);}
 if(at!==residue.length)throw Error('APOUSIA residual overflow');const source=out.join(' ');domain(source);return source;
}
export function apousiaPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);const fields=source.split(' '),plans:{k:number;budget:number;sites:number;folded:string;message:string;tokens:number}[]=[];
 for(const k of [1,2,3]){const contexts=new Map<string,{context:string[];next:string;count:number;ambiguous:boolean}>();
  for(let i=k;i<fields.length;i++){const context=fields.slice(i-k,i),key=JSON.stringify(context),old=contexts.get(key);if(old){old.count++;if(old.next!==fields[i])old.ambiguous=true;}else contexts.set(key,{context,next:fields[i],count:1,ambiguous:false});}
  const selected=[...contexts].filter(([,r])=>!r.ambiguous&&r.count>=3).sort((a,b)=>((b[1].count-1)*(b[1].next.length+1)-b[0].length)-((a[1].count-1)*(a[1].next.length+1)-a[0].length)||a[0].localeCompare(b[0]));
  for(const budget of [8,32,128]){const entries=selected.slice(0,budget);if(!entries.length)continue;const rules=new Map(entries.map(([key,r])=>[key,r.next])),residue:string[]=[];let sites=0;
   for(let i=0;i<fields.length;i++){const predicted=i>=k?rules.get(JSON.stringify(fields.slice(i-k,i))):undefined;if(predicted!==undefined){if(predicted!==fields[i])throw Error('APOUSIA prediction');sites++;}else residue.push(fields[i]);}
   const folded=JSON.stringify([fields.length,entries.map(([,r])=>[r.context,r.next]),residue.join(' ')]);if(folded.length>200000||plans.some(p=>p.k===k&&p.folded===folded))continue;if(apousiaUndo(folded,k)!==source)throw Error('APOUSIA inverse');const message=apousiaKey(k)+folded;plans.push({k,budget,sites,folded,message,tokens:countTokensExact(message,enc)});
  }
 }return plans.sort((a,b)=>a.tokens-b.tokens||a.k-b.k||a.budget-b.budget);
}
export function apousiaRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>202000)throw Error('APOUSIA message cap');for(const k of [1,2,3]){const key=apousiaKey(k);if(message.startsWith(key))return apousiaUndo(parent(message.slice(key.length)),k);}throw Error('APOUSIA contract');}
