/** X142 EUTAXIA (good order): endogenous-order reconstruction.
 * A unique monotone key already carried by each source line is an ordering
 * certificate. Reorder the run to help the parent; recover source order by
 * sorting decoded lines by that key, without transmitting a permutation.
 * Distinct from fixed-stride ANASTROPHE and VALENCE's paid permutation rank.
 * Sorting/clustering is classical; repository-scoped experiment, unwired.
 */
import {tagstackEncode,type TagstackResult} from './tagstack';
import {countTokens,type EncodingName} from './bpe';
export type EutaxiaSpec={start:number;count:number;field:number;numeric:boolean;descending:boolean};
const CAP=50000,LINES=1000;
function key(line:string,s:EutaxiaSpec):string|null{
 const v=s.field===0?line:line.trim().split(/ +/)[s.field-1];
 if(v===undefined||!v.length||s.numeric&&!/^\d{1,30}$/.test(v))return null;
 return s.numeric?BigInt(v).toString():v;
}
function compare(a:string,b:string,numeric:boolean):number{
 if(numeric){const x=BigInt(a),y=BigInt(b);return x<y?-1:x>y?1:0;}
 return a<b?-1:a>b?1:0;
}
function validate(s:EutaxiaSpec,n:number){
 if(!Number.isInteger(s.start)||!Number.isInteger(s.count)||!Number.isInteger(s.field)||s.start<0||s.count<2||s.start+s.count>n||s.field<0||s.field>16||typeof s.numeric!=='boolean'||typeof s.descending!=='boolean')throw Error('EUTAXIA bounds');
}
export function eutaxiaUndo(text:string,s:EutaxiaSpec):string{
 if(text.length>CAP||!/^[\x20-\x7e\n]*$/.test(text))throw Error('EUTAXIA domain');
 const lines=text.split('\n');if(lines.length>LINES)throw Error('EUTAXIA lines');validate(s,lines.length);
 const run=lines.slice(s.start,s.start+s.count).map(line=>({line,key:key(line,s)}));
 if(run.some(r=>r.key===null)||new Set(run.map(r=>r.key)).size!==run.length)throw Error('EUTAXIA key');
 run.sort((a,b)=>compare(a.key!,b.key!,s.numeric)*(s.descending?-1:1));
 lines.splice(s.start,s.count,...run.map(r=>r.line));return lines.join('\n');
}
export function eutaxiaKey(s:EutaxiaSpec):string{
 return `After decoding the payload, sort lines ${s.start+1} through ${s.start+s.count} by ${s.field===0?'the whole line':`space-separated field ${s.field}`} in ${s.descending?'descending':'ascending'} ${s.numeric?'integer':'ASCII lexicographic'} order. Preserve all line characters and other lines; print only.\n`;
}
/** Bounded maximal-monotone-run census, not an optimal permutation search.
 * Greedy run selection; rank by extent, at most 4 distinct runs. For each,
 * 3 deterministic source-derived cluster orders; no wall-clock timeout.
 */
export function eutaxiaPlans(text:string){
 if(text.length>CAP||!/^[\x20-\x7e\n]*$/.test(text))return [];
 const lines=text.split('\n');if(lines.length>LINES)return [];
 const specs:EutaxiaSpec[]=[];
 for(let field=0;field<=16;field++)for(const numeric of [false,true])for(const descending of [false,true]){
  if(field===0&&numeric)continue;
  const s:EutaxiaSpec={start:0,count:0,field,numeric,descending};let start=0,prev:string|null=null;
  for(let i=0;i<=lines.length;i++){
   const v=i<lines.length?key(lines[i],s):null;
   const continues=v!==null&&prev!==null&&compare(prev,v,numeric)*(descending?-1:1)<0;
   if(!continues){if(i-start>=8)specs.push({...s,start,count:i-start});start=i;}
   prev=v;
  }
 }
 specs.sort((a,b)=>b.count-a.count||a.start-b.start||a.field-b.field||Number(a.numeric)-Number(b.numeric));
 const seenSpecs=new Set<string>(),selected:EutaxiaSpec[]=[];
 for(const s of specs){const id=`${s.start}:${s.count}`;if(seenSpecs.has(id))continue;seenSpecs.add(id);selected.push(s);if(selected.length===4)break;}
 const out:{spec:EutaxiaSpec;order:string;folded:string;contract:string}[]=[],seen=new Set<string>();
 for(const spec of selected)for(const order of ['reverse-fields','length','reverse-characters']){
  const run=lines.slice(spec.start,spec.start+spec.count);
  const cluster=(x:string)=>order==='reverse-fields'?x.trim().split(/ +/).reverse().join(' '):order==='length'?String(x.length).padStart(6,'0')+x:[...x].reverse().join('');
  run.sort((a,b)=>{const x=cluster(a),y=cluster(b);return x<y?-1:x>y?1:0;});
  const copy=lines.slice();copy.splice(spec.start,spec.count,...run);const folded=copy.join('\n');
  if(folded===text||seen.has(folded))continue;seen.add(folded);
  if(eutaxiaUndo(folded,spec)!==text)throw Error('EUTAXIA inverse');
  out.push({spec,order,folded,contract:eutaxiaKey(spec)});
 }
 return out;
}

/** Experimental exact fallback tournament. Paying a new search can regress
 * runtime even on fallback; no Pareto or native-readability claim is implied.
 * One candidate matches the preregistered parent harness policy.
 */
export function eutaxiaEncode(text:string,enc:EncodingName='o200k_base',baseline?:TagstackResult){
 const parent=baseline??tagstackEncode(text,enc);
 if(parent.decoded!==text||!parent.exact||!parent.frontierComplete)throw Error('EUTAXIA incomplete parent');
 let best=parent,candidateTokens:number|null=null,applied=false;
 const plan=eutaxiaPlans(text)[0];
 if(plan){
  const q=tagstackEncode(plan.folded,enc);
  if(!q.exact||!q.frontierComplete||eutaxiaUndo(q.decoded,plan.spec)!==text)throw Error('EUTAXIA parent mismatch');
  const message=plan.contract+q.message;candidateTokens=countTokens(message,enc);
  if(candidateTokens<parent.messageTokens){best={...parent,message,messageTokens:candidateTokens,decoded:text};applied=true;}
 }
 return {...best,eutaxia:applied,candidateTokens,nativeVerified:false};
}
