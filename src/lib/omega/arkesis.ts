/** ARKESIS (X154): prefix cardinalities replace JSON end delimiters.
 * Experimental/unwired. {N introduces N key/value pairs, [N introduces N
 * values. A countdown, not indentation or a closing marker, locates each end.
 * Classical degree-sequence tree encoding; no new information theory claim.
 * Lexical tokens are copied (duplicate keys and number spellings preserved).
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
const CAP=50000,DEPTH=128;
type Node={kind:'leaf',raw:string}|{kind:'object',keys:string[],children:Node[]}|{kind:'array',children:Node[]};
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('ARKESIS domain');}
function parse(s:string,prefix:boolean):Node{
 domain(s);let i=0,nodes=0;
 const ws=()=>{while(i<s.length&&/[ \t\r\n]/.test(s[i]!))i++;};
 const str=()=>{const start=i++;while(i<s.length){if(s[i]==='\\'){i+=2;continue;}if(s[i++]==='"'){const raw=s.slice(start,i);JSON.parse(raw);return raw;}}throw Error('ARKESIS string');};
 function node(depth:number):Node{
  ws();if(depth>DEPTH||++nodes>10000)throw Error('ARKESIS budget');const c=s[i];
  if(c==='{'||c==='['){i++;const object=c==='{',children:Node[]=[],keys:string[]=[];let count=-1;
   if(prefix){const m=/^(0|[1-9]\d*)/.exec(s.slice(i));if(!m)throw Error('ARKESIS cardinality');i+=m[0].length;count=Number(m[0]);if(count>10000||i<s.length&&!/\s/.test(s[i]!))throw Error('ARKESIS count boundary');}
   ws();while(prefix?children.length<count:s[i]!== (object?'}':']')){
    if(children.length&& !prefix){if(s[i++]!==',')throw Error('ARKESIS comma');ws();}
    if(object){if(s[i]!=='"')throw Error('ARKESIS key');keys.push(str());ws();if(s[i++]!==':')throw Error('ARKESIS colon');}
    children.push(node(depth+1));ws();
   }
   if(!prefix)i++;return object?{kind:'object',keys,children}:{kind:'array',children};
  }
  if(c==='"')return {kind:'leaf',raw:str()};
  const m=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(s.slice(i));if(!m)throw Error('ARKESIS literal');i+=m[0].length;return {kind:'leaf',raw:m[0]};
 }
 const result=node(0);ws();if(i!==s.length)throw Error('ARKESIS trailing');return result;
}
function render(n:Node,width:number,depth=0):string{
 if(n.kind==='leaf')return n.raw;const o=n.kind==='object',start=o?'{':'[',end=o?'}':']';if(!n.children.length)return start+end;
 return start+'\n'+n.children.map((c,i)=>' '.repeat((depth+1)*width)+(o?n.keys[i]+': ':'')+render(c,width,depth+1)).join(',\n')+'\n'+' '.repeat(depth*width)+end;
}
function fold(n:Node):string{if(n.kind==='leaf')return n.raw;return (n.kind==='object'?'{':'[')+n.children.length+(n.children.length?' '+n.children.map((c,i)=>(n.kind==='object'?n.keys[i]+':':'')+fold(c)).join(' '):'');}
export function arkesisKey(width:number){if(![1,2,4].includes(width))throw Error('ARKESIS width');return `After decoding, read prefix JSON: {N has N key:value pairs, [N has N values; spaces separate items, counts replace closing brackets and commas. Format JSON with ${width}-space indentation and final LF; preserve lexical tokens and key order. Print only.\n`;}
export function arkesisUndo(s:string,width:number){arkesisKey(width);const out=render(parse(s,true),width)+'\n';domain(out);JSON.parse(out);return out;}
export function arkesisPlans(s:string){try{domain(s);JSON.parse(s);const n=parse(s,false),folded=fold(n);return [1,2,4].filter(w=>render(n,w)+'\n'===s).map(width=>({width,folded}));}catch{return [];}}
export function arkesisRead(message:string,readParent:(s:string)=>string){for(const width of [1,2,4]){const k=arkesisKey(width);if(message.startsWith(k))return arkesisUndo(readParent(message.slice(k.length)),width);}throw Error('ARKESIS envelope');}
export function arkesisCandidate(source:string,width:number,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 const p=arkesisPlans(source).find(p=>p.width===width);if(!p)return null;
 try{if(readParent(parent)!==p.folded)return null;const message=arkesisKey(width)+parent;if(arkesisRead(message,readParent)!==source)return null;return {message,tokens:countTokens(message,enc),width};}catch{return null;}
}

/** Lexical-tree interface for independently framed structural experiments.
 * Exposes the existing parser/renderer without changing ARKESIS wire behavior. */
export type LexicalJsonTree = Node;
export function lexicalJsonTree(source:string):LexicalJsonTree {domain(source);JSON.parse(source);return parse(source,false);}
export function lexicalJsonRender(tree:LexicalJsonTree,width:number):string {arkesisKey(width);const out=render(tree,width)+'\n';domain(out);return out;}
