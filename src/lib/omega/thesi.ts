/** X167 THESI (placement): inverted lexical occurrence postings.
 * Classical positional-index ancestry, not new information theory. Experimental,
 * unwired; program inversion is NOT native-model behavior verification.
 * Unlike dictionary glyph references, the body has identical holes and each
 * word carries the positions at which to scatter its literal spelling.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const THESI_CAP=50000;
export const THESI_KEY='Decode payload first. First line: JSON rows [word,positions]. Positions number ^ holes from 1 in remaining text. Comma-separated p or p/s/n means positions p,p+s,... (n positions). Replace each hole with its row\'s word; preserve everything else; print only.\n';
function domain(s:string){if(s.length>THESI_CAP||!isUtf8TransportStable(s))throw Error('THESI domain');}
function postings(xs:number[]){const out:string[]=[];for(let i=0;i<xs.length;){let j=i+1;const step=xs[j]-xs[i];while(j+1<xs.length&&xs[j+1]-xs[j]===step)j++;if(j-i+1>=3){out.push(`${xs[i]}/${step}/${j-i+1}`);i=j+1;}else out.push(String(xs[i++]));}return out.join(',');}
export function thesiUndo(folded:string){
 domain(folded);const cut=folded.indexOf('\n');if(cut<0)throw Error('THESI frame');const rows:unknown=JSON.parse(folded.slice(0,cut)),body=folded.slice(cut+1),holes=(body.match(/\^/g)||[]).length;
 if(!Array.isArray(rows)||rows.length<1||rows.length>4096||!holes)throw Error('THESI rows');const slots=new Array<string>(holes);let assigned=0,units=body.length-holes;
 for(const row of rows){if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||! /^[A-Za-z]+$/.test(row[0])||typeof row[1]!=='string'||!row[1])throw Error('THESI row');
  for(const spec of row[1].split(',')){if(!/^[1-9][0-9]{0,4}(?:\/[1-9][0-9]{0,4}\/[1-9][0-9]{0,4})?$/.test(spec))throw Error('THESI posting');const a=spec.split('/').map(Number),start=a[0],step=a[1]??1,n=a[2]??1;
   if(start+(n-1)*step>holes)throw Error('THESI position');if(units+n*row[0].length>THESI_CAP)throw Error('THESI output cap');units+=n*row[0].length;
   for(let j=0;j<n;j++){const pos=start+j*step-1;if(slots[pos]!==undefined)throw Error('THESI duplicate');slots[pos]=row[0];assigned++;}
  }
 }
 if(assigned!==holes)throw Error('THESI uncovered');let i=0;const result=body.replace(/\^/g,()=>slots[i++]);domain(result);return result;
}
export function thesiPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(source.includes('^'))return [];const counts=new Map<string,number>();for(const m of source.matchAll(/[A-Za-z]+/g))counts.set(m[0],(counts.get(m[0])??0)+1);
 const plans:{minLength:number;minFrequency:number;sites:number;folded:string;message:string;tokens:number}[]=[];
 for(const minLength of [4,8])for(const minFrequency of [3,5]){const words=new Map([...counts].filter(([w,n])=>w.length>=minLength&&n>=minFrequency).map(([w])=>[w,[] as number[]]));if(!words.size||words.size>4096)continue;let sites=0;const body=source.replace(/[A-Za-z]+/g,w=>{const positions=words.get(w);if(!positions)return w;positions.push(++sites);return '^';});
  const folded=JSON.stringify([...words].map(([w,xs])=>[w,postings(xs)]))+'\n'+body;if(folded.length>THESI_CAP||plans.some(p=>p.folded===folded))continue;if(thesiUndo(folded)!==source)throw Error('THESI inverse');const message=THESI_KEY+folded;plans.push({minLength,minFrequency,sites,folded,message,tokens:countTokens(message,enc)});
 }return plans.sort((a,b)=>a.tokens-b.tokens||a.minLength-b.minLength||a.minFrequency-b.minFrequency);
}
export function thesiRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>THESI_CAP+1000||!isUtf8TransportStable(message)||!message.startsWith(THESI_KEY))throw Error('THESI wire');return thesiUndo(parent(message.slice(THESI_KEY.length)));}
export function thesiFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(incumbent.length>THESI_CAP+1000||!isUtf8TransportStable(incumbent)||incumbent.startsWith(THESI_KEY)||readIncumbent(incumbent)!==source)throw Error('THESI incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const plans=thesiPlans(source,enc);
 const admit=(message:string,read:(s:string)=>string)=>{try{if(message.length>THESI_CAP+1000||!isUtf8TransportStable(message))return;const tokens=countTokens(message,enc);if(tokens<best.tokens&&thesiRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* verified fallback */}};
 for(const p of plans)admit(p.message,s=>s);if(plans.length){best.parentCalls++;try{admit(THESI_KEY+encodeParent(plans[0].folded),readParent);}catch{/* retain incumbent or verified raw candidate */}}return best;
}
