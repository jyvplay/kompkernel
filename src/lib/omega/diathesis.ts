/**
 * DIATHESIS (X151), experimental, unwired.
 *
 * Carries a short lower-case hexadecimal fragment in the permutation of an
 * existing contiguous dependency-free CHIRON rule window. This combines
 * permutation coding with an already-present grammar's order freedom: unlike
 * VALENCE it does not sort/encode source lines; unlike METATAXIS it changes
 * the order to carry *source information*, not only to reduce the tape cost.
 * Neither permutation coding nor the underlying information theory is new.
 *
 * This is not a native-model readability claim. Factoradic decoding is a major
 * behavioral risk. Full in-band instruction and true parent token cost count;
 * no default chain wiring and no speed claim. Domain and search are bounded.
 */
import {countTokens,type EncodingName} from './bpe';
import {CHIRON_SCRIPTS,chironInScript,chironParseTape,chironDecode} from './chiron';
import {readPlainParent} from './ekdysis-frontier';
import {isUtf8TransportStable} from './utf8-wire';

const MAX=50000, MAX_TRIALS=128;
type Rule={glyph:string;raw:string};
interface Frame {head:string;tape:string;tail:string;rules:Rule[]}
function frame(message:string):Frame|null{
 const start=message.indexOf('§'),end=message.indexOf('¶',start+1);
 if(start<0||end<0)return null;
 const tape=message.slice(start+1,end),script=CHIRON_SCRIPTS.find(s=>tape.length&&chironInScript(s,tape.codePointAt(0)!));
 const rules=script?chironParseTape(tape,script):null;
 if(!rules||!rules.length||rules.length>512)return null;
 return {head:message.slice(0,start+1),tape,tail:message.slice(end),rules};
}
const byCodepoint=(a:string,b:string)=>(a.codePointAt(0)!-b.codePointAt(0)!);
function fact(n:number):bigint{let v=1n;for(let i=2;i<=n;i++)v*=BigInt(i);return v;}
export function diathesisRank(keys:string[]):bigint{
 const pool=keys.slice().sort(byCodepoint);if(new Set(pool).size!==keys.length)throw Error('duplicate keys');
 let rank=0n;for(let i=0;i<keys.length;i++){const k=pool.indexOf(keys[i]!);if(k<0)throw Error('key');rank+=BigInt(k)*fact(keys.length-i-1);pool.splice(k,1);}return rank;
}
export function diathesisUnrank(keys:string[],rank:bigint):string[]{
 const pool=keys.slice().sort(byCodepoint);if(new Set(pool).size!==keys.length||rank<0n||rank>=fact(keys.length))throw Error('rank');
 const out:string[]=[];while(pool.length){const f=fact(pool.length-1),k=Number(rank/f);rank%=f;out.push(pool.splice(k,1)[0]!);}return out;
}
function key(start:number,n:number,width:number):string{
 return `After decoding, replace the sole ~ with ${width} lowercase hexadecimal digits, including leading zeroes: use the zero-based lexicographic permutation rank of the ${n} consecutive § rule keys starting at rule ${start} (rules count from 1), reduced modulo 16^${width}. Sort keys by Unicode code point for ranking. Preserve everything else.\n`;
}
const KEY_RE=/^After decoding, replace the sole ~ with ([4-8]) lowercase hexadecimal digits, including leading zeroes: use the zero-based lexicographic permutation rank of the (\d+) consecutive § rule keys starting at rule (\d+) \(rules count from 1\), reduced modulo 16\^\1\. Sort keys by Unicode code point for ranking\. Preserve everything else\.\n/;
function independentWindow(rs:Rule[]):boolean{
 const keys=new Set(rs.map(r=>r.glyph));return rs.every(r=>![...r.raw].some(c=>keys.has(c)));
}
/** Source-side choice is deterministic; the residual suffix and all other bytes stay literal. */
export function diathesisFold(source:string):{folded:string;value:bigint;width:number}|null{
 if(!source||source.length>MAX||!isUtf8TransportStable(source)||source.includes('~'))return null;
 const pattern=/(?<![0-9a-fA-F])[0-9a-f]{7,16}(?![0-9a-fA-F])/g;
 for(const m of source.matchAll(pattern)){
  const prefix=m[0].slice(0,7);if(!/[a-f]/.test(prefix)||!/[0-9]/.test(prefix))continue;
  return {folded:source.slice(0,m.index!)+'~'+source.slice(m.index!+7),value:BigInt('0x'+prefix),width:7};
 }
 return null;
}
/** The decoder consumes only the complete message, not encoder state. */
export function diathesisRead(message:string):string{
 if(message.length>MAX+2000||!isUtf8TransportStable(message))throw Error('transport');
 const m=KEY_RE.exec(message);if(!m)throw Error('contract');
 const w=Number(m[1]),n=Number(m[2]),start=Number(m[3]);
 if(n<2||n>20||start<1||start>512||fact(n)<16n**BigInt(w))throw Error('range');
 const parent=message.slice(m[0].length),f=frame(parent);if(!f||start+n-1>f.rules.length)throw Error('frame');
 const window=f.rules.slice(start-1,start-1+n);if(!independentWindow(window))throw Error('dependencies');
 const folded=readPlainParent(parent);
 if((folded.match(/~/g)??[]).length!==1)throw Error('marker');
 const v=diathesisRank(window.map(r=>r.glyph))%(16n**BigInt(w));
 const out=folded.replace('~',v.toString(16).padStart(w,'0'));
 if(out.length>MAX||!isUtf8TransportStable(out))throw Error('output');return out;
}
/** Search existing rule-order slack and report the best source-read exact
 * complete message, even if it is more expensive. Callers supply a real parent
 * for the folded source; `diathesisSelect` performs the incumbent comparison.
 */
export function diathesisTry(source:string,folded:string,parentMessage:string,enc:EncodingName='o200k_base'):{message:string;tokens:number;trials:number;start:number;n:number}|null{
 const plan=diathesisFold(source);if(!plan||plan.folded!==folded||parentMessage.length>MAX||!isUtf8TransportStable(parentMessage))return null;
 let decoded:string;try{decoded=readPlainParent(parentMessage)}catch{return null}if(decoded!==folded)return null;
 const f=frame(parentMessage);if(!f)return null;
 const ref=chironDecode('§'+f.tape+f.tail);if(ref==='§'+f.tape+f.tail)return null;
 const radix=16n**BigInt(plan.width);let n=2;while(n<=20&&fact(n)<radix)n++;if(n>20)return null;
 let best=Number.POSITIVE_INFINITY,bestMsg='',bestStart=0,trials=0;
 for(let i=0;i+n<=f.rules.length&&trials<MAX_TRIALS;i++){
  const window=f.rules.slice(i,i+n);if(!independentWindow(window))continue;
  const keys=window.map(r=>r.glyph),lookup=new Map(window.map(r=>[r.glyph,r]));
  for(let rank=plan.value;rank<fact(n)&&trials<MAX_TRIALS;rank+=radix){
   const ordering=diathesisUnrank(keys,rank), replacement=ordering.map(k=>{const r=lookup.get(k)!;return r.glyph+r.raw}).join('');
   const tape=f.rules.slice(0,i).map(r=>r.glyph+r.raw).join('')+replacement+f.rules.slice(i+n).map(r=>r.glyph+r.raw).join('');
   const parent=f.head+tape+f.tail,message=key(i+1,n,plan.width)+parent;trials++;
   const cost=countTokens(message,enc);if(cost>=best)continue;
   if(chironDecode('§'+tape+f.tail)!==ref)continue;
   try{if(diathesisRead(message)!==source)continue}catch{continue}
   best=cost;bestMsg=message;bestStart=i+1;
  }
 }
 return bestMsg?{message:bestMsg,tokens:best,trials,start:bestStart,n}:null;
}
/** Strict full-message fallback to the actual supplied incumbent. */
export function diathesisSelect(source:string,folded:string,parentMessage:string,incumbentMessage:string,enc:EncodingName='o200k_base'){
 const p=diathesisTry(source,folded,parentMessage,enc);
 return p&&p.tokens<countTokens(incumbentMessage,enc)?p:null;
}
