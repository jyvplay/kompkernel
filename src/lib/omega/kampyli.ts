/** KAMPYLI (X161, curvature): exact degree-2..4 finite-difference tables.
 * Classical Newton forward differences, not a new theorem. Optional only.
 * Constant/linear companion columns are admitted only beside a nonlinear one.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const KAMPYLI_KEY='Decode first. Each !curve N S column;column line generates N rows. Each column lists a,d,...: print a, then add each next difference to its predecessor left to right after each row. S is s=space,t=tab,c=comma between columns; LF between rows. Replace that line only; preserve other text; print only.\n';
const CAP=50000,MAX=10n**24n;
const integer=/^-?(?:0|[1-9][0-9]*)$/;
function number(s:string){if(!integer.test(s)||s==='-0'||s.length>26)throw Error('KAMPYLI integer');const n=BigInt(s);if(n<=-MAX||n>=MAX)throw Error('KAMPYLI magnitude');return n;}
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('KAMPYLI domain');}
function fields(s:string){const delim=s.includes('\t')?'\t':s.includes(',')?',':' ';const a=s.split(delim);if(a.length>16||a.some(x=>!integer.test(x)))return null;try{for(const x of a)number(x);}catch{return null;}return {a,delim};}
function step(a:bigint[]){for(let i=0;i+1<a.length;i++){a[i]+=a[i+1];if(a[i]<=-MAX||a[i]>=MAX)throw Error('KAMPYLI recurrence bound');}}
export function kampyliUndo(folded:string):string{
 domain(folded);let size=0;
 const out=folded.split('\n').map(line=>{
  if(line.startsWith('!curve')){
   const m=/^!curve ([1-9][0-9]{0,3}) ([stc]) (.+)$/.exec(line);if(!m)throw Error('KAMPYLI header');const n=+m[1];if(n<8||n>2000)throw Error('KAMPYLI rows');
   const states=m[3].split(';').map(part=>part.split(',').map(number));if(states.length>16||states.some(a=>a.length>5||a.length>1&&a.at(-1)===0n)||!states.some(a=>a.length>=3))throw Error('KAMPYLI degree');
   const sep=m[2]==='s'?' ':m[2]==='t'?'\t':',';const rows:string[]=[];let expanded=0;
   for(let r=0;r<n;r++){const row=states.map(a=>String(a[0])).join(sep);expanded+=row.length+1;if(expanded>CAP+1)throw Error('KAMPYLI expansion');rows.push(row);if(r+1<n)for(const a of states)step(a);}line=rows.join('\n');
  }
  size+=line.length+1;if(size>CAP+1)throw Error('KAMPYLI expansion');return line;
 }).join('\n');domain(out);return out;
}
function initial(values:bigint[]):bigint[]|null{
 let a=values;const seed=[a[0]];if(a.every(v=>v===a[0]))return seed;
 for(let d=1;d<=4;d++){a=a.slice(1).map((v,j)=>v-a[j]);seed.push(a[0]);if(a.every(v=>v===a[0]))return seed;}
 return null;
}
export function kampyliPlan(source:string){try{
 domain(source);if(source.includes('!curve'))return null;const lines=source.split('\n'),out:string[]=[];let blocks=0,columns=0,cells=0;
 for(let i=0;i<lines.length;){const f=fields(lines[i]);if(!f){out.push(lines[i++]);continue;}
  let end=i+1;while(end<lines.length&&end-i<2000){const g=fields(lines[end]);if(!g||g.a.length!==f.a.length||g.delim!==f.delim)break;end++;}
  const rows=lines.slice(i,end).map(s=>fields(s)!.a);const seeds=rows.length>=8?f.a.map((_,c)=>initial(rows.map(row=>number(row[c])))):[];
  if(seeds.length&&seeds.every(a=>a!==null)&&seeds.some(a=>a!.length>=3)){
   const sep=f.delim===' '?'s':f.delim==='\t'?'t':'c',line=`!curve ${rows.length} ${sep} ${seeds.map(a=>a!.join(',')).join(';')}`;
   if(kampyliUndo(line)!==lines.slice(i,end).join('\n'))throw Error('KAMPYLI block inverse');out.push(line);blocks++;columns+=f.a.length;cells+=rows.length*f.a.length;
  }else out.push(...lines.slice(i,end));i=end;
 }
 if(!blocks)return null;const folded=out.join('\n');if(kampyliUndo(folded)!==source)throw Error('KAMPYLI inverse');return {folded,blocks,columns,cells};
 }catch{return null;}}
export function kampyliEncode(source:string,enc:EncodingName='o200k_base'){
 const p=kampyliPlan(source);if(!p)return null;const message=KAMPYLI_KEY+p.folded;
 if(kampyliUndo(p.folded)!==source)throw Error('KAMPYLI encode inverse');
 return {...p,message,tokens:countTokens(message,enc)};
}
export function kampyliRead(message:string,readParent:(s:string)=>string){domain(message);if(!message.startsWith(KAMPYLI_KEY))throw Error('KAMPYLI key');return kampyliUndo(readParent(message.slice(KAMPYLI_KEY.length)));}
export function kampyliFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(readIncumbent(incumbent)!==source)throw Error('KAMPYLI incumbent');const tokens=countTokens(incumbent,enc);let best={message:incumbent,tokens,applied:false,parentCalls:0};const p=kampyliPlan(source);if(!p)return best;
 const admit=(message:string,reader:(s:string)=>string)=>{try{const cost=countTokens(message,enc);if(cost<best.tokens&&kampyliRead(message,reader)===source)best={...best,message,tokens:cost,applied:true};}catch{/* Fail closed. */}};
 admit(KAMPYLI_KEY+p.folded,s=>s);best.parentCalls=1;
 try{admit(KAMPYLI_KEY+encodeParent(p.folded),readParent);}catch{/* Raw admitted candidate or incumbent retained. */}return best;
}
