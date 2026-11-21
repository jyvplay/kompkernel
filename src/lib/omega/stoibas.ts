/** STOIBAS (X155): breadth-first JSON record queue, with object degrees
 * supplied implicitly by key-list length. Not ARKESIS's recursive count stream:
 * object keys are grouped before all children, whose records are deferred FIFO.
 * Classical level-order tree serialization ancestry; experimental and unwired.
 */
import {lexicalJsonTree,lexicalJsonRender,type LexicalJsonTree} from './arkesis';
import {isUtf8TransportStable} from './utf8-wire';
import {countTokens,type EncodingName} from './bpe';
const CAP=50000;
export function stoibasKey(width:number){if(![1,2,4].includes(width))throw Error('STOIBAS width');return `Decode first. Lines are JSON tree nodes in breadth-first order. A { line lists quoted object keys; [N means an N-element array; other lines are literal values. Assign subsequent nodes to child slots FIFO. Format JSON with ${width}-space indentation and final LF, preserving lexical tokens and key order. Print only.\n`;}
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('STOIBAS domain');}
export function stoibasUndo(folded:string,width:number){
 stoibasKey(width);domain(folded);if(!folded||folded.endsWith('\n'))throw Error('STOIBAS framing');const rows=folded.split('\n');if(rows.length>10000)throw Error('STOIBAS node cap');
 const nodes:LexicalJsonTree[]=rows.map(row=>{
  if(row[0]==='{'){
   const keys:string[]=[];let i=1;
   while(i<row.length){if(row[i++]!==' ')throw Error('STOIBAS key separator');const m=/^"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[\da-fA-F]{4}))*"/.exec(row.slice(i));if(!m)throw Error('STOIBAS key');JSON.parse(m[0]);keys.push(m[0]);i+=m[0].length;}
   return {kind:'object',keys,children:[]};
  }
  if(row[0]==='['){if(!/^\[(0|[1-9]\d*)$/.test(row)||Number(row.slice(1))>10000)throw Error('STOIBAS array');return {kind:'array',children:[]};}
  const n=lexicalJsonTree(row);if(n.kind!=='leaf'||n.raw!==row)throw Error('STOIBAS scalar');return n;
 });
 let next=1;const depth=new Uint16Array(nodes.length);
 for(let i=0;i<nodes.length;i++){
  if(i>=next)throw Error('STOIBAS orphan');const n=nodes[i];if(depth[i]>128)throw Error('STOIBAS depth');if(n.kind==='leaf')continue;
  const count=n.kind==='object'?n.keys.length:Number(rows[i].slice(1));if(next+count>nodes.length)throw Error('STOIBAS missing children');
  n.children=nodes.slice(next,next+count);for(let j=next;j<next+count;j++)depth[j]=depth[i]+1;next+=count;
 }
 if(next!==nodes.length)throw Error('STOIBAS cardinality');const out=lexicalJsonRender(nodes[0],width);domain(out);JSON.parse(out);return out;
}
export function stoibasPlans(source:string){try{domain(source);const root=lexicalJsonTree(source),queue=[root],rows:string[]=[];
 for(let i=0;i<queue.length;i++){if(queue.length>10000)throw Error('STOIBAS cap');const n=queue[i];if(n.kind==='leaf')rows.push(n.raw);else{rows.push(n.kind==='array'?'['+n.children.length:'{'+n.keys.map(k=>' '+k).join(''));queue.push(...n.children);}}
 const folded=rows.join('\n');domain(folded);return [1,2,4].flatMap(width=>{
  // A wider rendering can exceed the output cap even when another width fits.
  // Reject that width only; do not discard independently verified siblings.
  try{if(lexicalJsonRender(root,width)===source&&stoibasUndo(folded,width)===source)return [{width,folded,nodes:queue.length}];}catch{/* width-specific refusal */}
  return [];
 });
 }catch{return [];}}
export function stoibasRead(message:string,readParent:(s:string)=>string){for(const w of [1,2,4]){const k=stoibasKey(w);if(message.startsWith(k))return stoibasUndo(readParent(message.slice(k.length)),w);}throw Error('STOIBAS envelope');}
export function stoibasCandidate(source:string,width:number,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(parent))return null;
 const p=stoibasPlans(source).find(p=>p.width===width);if(!p)return null;
 try{if(readParent(parent)!==p.folded)return null;const message=stoibasKey(width)+parent;if(stoibasRead(message,readParent)!==source)return null;return {message,tokens:countTokens(message,enc),width};}catch{return null;}
}

/** Typed-line arm: line end frames string content; the object-key channel
 * supplies string type. Quoted exceptional keys retain their exact lexemes.
 * This variant inherits no evidence from the fully quoted arm. */
const bareKey=/^[A-Za-z_$][A-Za-z0-9_$./@%*-]*$/;
const quotedToken=/"(?:[^"\\\x00-\x1f]|\\(?:["\\/bfnrt]|u[\da-fA-F]{4}))*"/g;
export function stoibasCompactKey(width:number){return stoibasKey(width).replace('lists quoted object keys;','lists object keys (quote bare keys);').replace('other lines are literal values.','=text is a JSON string with outer quotes removed; other lines are literal values.');}
export function stoibasCompactUndo(folded:string,width:number){domain(folded);const rows=folded.split('\n').map(row=>{
 if(row.startsWith('='))return '"'+row.slice(1)+'"';
 if(!row.startsWith('{'))return row;
 let out='{',i=1;while(i<row.length){if(row[i++]!==' ')throw Error('STOIBAS compact separator');
  if(row[i]==='"'){quotedToken.lastIndex=i;const m=quotedToken.exec(row);if(!m||m.index!==i)throw Error('STOIBAS quoted key');out+=' '+m[0];i+=m[0].length;}
  else{const end=row.indexOf(' ',i),k=row.slice(i,end<0?row.length:end);if(!bareKey.test(k))throw Error('STOIBAS bare key');out+=' '+JSON.stringify(k);i=end<0?row.length:end;}
 }return out;
 });return stoibasUndo(rows.join('\n'),width);}
export function stoibasCompactPlans(source:string){return stoibasPlans(source).flatMap(p=>{
 const folded=p.folded.split('\n').map(row=>row.startsWith('"')?'='+row.slice(1,-1):row.startsWith('{')?row.replace(quotedToken,raw=>bareKey.test(raw.slice(1,-1))?raw.slice(1,-1):raw):row).join('\n');
 try{if(stoibasCompactUndo(folded,p.width)!==source)return [];}catch{return [];}
 return [{...p,folded}];
 });}
export function stoibasCompactRead(message:string,readParent:(s:string)=>string){for(const w of [1,2,4]){const k=stoibasCompactKey(w);if(message.startsWith(k))return stoibasCompactUndo(readParent(message.slice(k.length)),w);}throw Error('STOIBAS compact envelope');}
export function stoibasCompactCandidate(source:string,width:number,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 if(!isUtf8TransportStable(parent))return null;
 const p=stoibasCompactPlans(source).find(p=>p.width===width);if(!p)return null;try{if(readParent(parent)!==p.folded)return null;const message=stoibasCompactKey(width)+parent;if(stoibasCompactRead(message,readParent)!==source)return null;return {message,tokens:countTokens(message,enc),width};}catch{return null;}
}
