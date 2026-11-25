/** X184 KARTES: paid Cartesian-tree shape / preorder-field separation.
 * Classical Cartesian-tree ancestry, not a new mathematical primitive.
 * Unwired. Unlike KLADOS no adaptive lookup tree; unlike PINAKAS no insertion
 * tableau; unlike STOIBAS the tree is induced on arbitrary space fields.
 * Pricing retains the reference tokenizer's reserved-spelling exclusions.
 */
import {countTokensExact,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
const CAP=50000,FRAME=220000;
export const KARTES_KEY='Decode payload first. JSON array of [shape,fields] blocks. Split fields on ASCII spaces retaining empties. Each shape digit describes one node in preorder: 0=no children, 1=left only, 2=right only, 3=both. Assign fields to nodes in preorder. Read each tree inorder (left,node,right); join all resulting fields with ASCII spaces. Preserve every other character; print only.\n';
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('KARTES domain');}
export type KartesMetric='lex'|'length';
function compare(a:string,b:string,metric:KartesMetric){if(metric==='length')return [...a].length-[...b].length;const x=[...a],y=[...b];for(let i=0;i<Math.min(x.length,y.length);i++){const d=x[i].codePointAt(0)!-y[i].codePointAt(0)!;if(d)return d;}return x.length-y.length;}
export function kartesBlock(a:string[],metric:KartesMetric):[string,string]{
 if(!['lex','length'].includes(metric)||!a.length||a.length>512||a.some(s=>typeof s!=='string'||s.includes(' ')))throw Error('KARTES block');domain(a.join(' '));
 const left=new Int32Array(a.length).fill(-1),right=new Int32Array(a.length).fill(-1),stack:number[]=[];
 // Strict comparison preserves the first equal-priority field as ancestor.
 for(let i=0;i<a.length;i++){let last=-1;while(stack.length&&compare(a[i],a[stack[stack.length-1]],metric)<0)last=stack.pop()!;if(stack.length)right[stack[stack.length-1]]=i;left[i]=last;stack.push(i);}
 const todo=[stack[0]],shape:string[]=[],values:string[]=[];
 while(todo.length){const i=todo.pop()!;shape.push(String((left[i]>=0?1:0)+(right[i]>=0?2:0)));values.push(a[i]);if(right[i]>=0)todo.push(right[i]);if(left[i]>=0)todo.push(left[i]);}
 return [shape.join(''),values.join(' ')];
}
export function kartesUndo(folded:string){
 if(folded.length>FRAME||!isUtf8TransportStable(folded))throw Error('KARTES frame cap');const rows:unknown=JSON.parse(folded);
 if(!Array.isArray(rows)||!rows.length||rows.length>1563)throw Error('KARTES blocks');const result:string[]=[];let units=0;
 for(const row of rows){
  if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||! /^[0-3]{1,512}$/.test(row[0])||typeof row[1]!=='string')throw Error('KARTES row');
  const fields=row[1].split(' '),n=fields.length;if(n!==row[0].length)throw Error('KARTES arity');units+=row[1].length+(result.length?1:0);if(units>CAP)throw Error('KARTES expansion');
  const left=new Int32Array(n).fill(-1),right=new Int32Array(n).fill(-1),slots:{parent:number;side:'left'|'right'}[]=[];
  for(let i=0;i<n;i++){if(i){const slot=slots.pop();if(!slot)throw Error('KARTES surplus node');(slot.side==='left'?left:right)[slot.parent]=i;}const flag=Number(row[0][i]);if(flag&2)slots.push({parent:i,side:'right'});if(flag&1)slots.push({parent:i,side:'left'});}
  if(slots.length)throw Error('KARTES missing node');const stack:number[]=[];let at=0;
  while(at>=0||stack.length){while(at>=0){stack.push(at);at=left[at];}at=stack.pop()!;result.push(fields[at]);at=right[at];}
 }
 const source=result.join(' ');domain(source);return source;
}
export function kartesPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);const a=source.split(' '),plans:{width:number;metric:KartesMetric;folded:string;message:string;tokens:number}[]=[];
 for(const width of [32,128,512])for(const metric of ['lex','length'] as const){const rows:[string,string][]=[];for(let i=0;i<a.length;i+=width)rows.push(kartesBlock(a.slice(i,i+width),metric));const folded=JSON.stringify(rows);if(folded.length>FRAME||plans.some(p=>p.folded===folded))continue;if(kartesUndo(folded)!==source)throw Error('KARTES inverse');const message=KARTES_KEY+folded;plans.push({width,metric,folded,message,tokens:countTokensExact(message,enc)});}
 return plans.sort((a,b)=>a.tokens-b.tokens||a.width-b.width||a.metric.localeCompare(b.metric));
}
export function kartesRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>FRAME+2000||!isUtf8TransportStable(message)||!message.startsWith(KARTES_KEY))throw Error('KARTES wire');return kartesUndo(parent(message.slice(KARTES_KEY.length)));}
