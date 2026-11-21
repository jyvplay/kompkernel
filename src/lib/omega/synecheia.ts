/** X156 SYNECHEIA (continuity): coupled page-interval endpoint recurrence.
 * Experimental/unwired. Classical predictive/delta ancestry, not a new theorem.
 * Unlike independent numeric-column deltas, next start may consume previous END;
 * end is recovered from a page count. All non-address bytes remain verbatim.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const SYNECHEIA_KEY='Decode body first. At line starts, @HEX+N or @N replaces an address range: start is HEX, or the previous @ record end; end=start+4096*N (N decimal). Write start-end in lowercase hex, each padded to at least 12 digits. Keep the rest verbatim. Print only.\n';
const CAP=50000,MAX=(1n<<64n)-1n;
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('SYNECHEIA domain');}
const hex=(n:bigint)=>n.toString(16).padStart(12,'0');
export function synecheiaUndo(folded:string):string{
 domain(folded);let previous:bigint|null=null;
 const out=folded.split('\n').map(line=>{
  if(!line.startsWith('@'))return line;
  const m=/^@(?:([0-9a-f]{1,16})\+)?([1-9][0-9]{0,15})(?= )/.exec(line);if(!m)throw Error('SYNECHEIA record');
  const start=m[1]!==undefined?BigInt('0x'+m[1]):previous;if(start===null)throw Error('SYNECHEIA initial endpoint');
  const end=start+4096n*BigInt(m[2]);if(start%4096n!==0n||end>MAX)throw Error('SYNECHEIA address bounds');previous=end;
  return hex(start)+'-'+hex(end)+line.slice(m[0].length);
 }).join('\n');domain(out);return out;
}
export function synecheiaPlan(source:string){
 try{domain(source);if(/^@/m.test(source))return null;let previous:bigint|null=null,hits=0,linked=0;
 const folded=source.split('\n').map(line=>{
  const m=/^([0-9a-f]{12,16})-([0-9a-f]{12,16})(?= )/.exec(line);if(!m)return line;
  const start=BigInt('0x'+m[1]),end=BigInt('0x'+m[2]);
  if(end<=start||start%4096n||end%4096n||hex(start)!==m[1]||hex(end)!==m[2])return line;
  const adjacent=previous===start;previous=end;hits++;if(adjacent)linked++;
  return '@'+(adjacent?'':start.toString(16)+'+')+((end-start)/4096n).toString()+line.slice(m[0].length);
 }).join('\n');
 if(!hits||synecheiaUndo(folded)!==source)return null;return {folded,hits,linked};
 }catch{return null;}
}
export function synecheiaRead(message:string,readParent:(s:string)=>string){domain(message);if(!message.startsWith(SYNECHEIA_KEY))throw Error('SYNECHEIA envelope');return synecheiaUndo(readParent(message.slice(SYNECHEIA_KEY.length)));}
export function synecheiaCandidate(source:string,parent:string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 try{domain(source);domain(parent);const message=SYNECHEIA_KEY+parent;if(synecheiaRead(message,readParent)!==source)return null;return {message,tokens:countTokens(message,enc)};}catch{return null;}
}
/** Explicit reader injection supports incumbent families without hidden source access. */
export function synecheiaFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(readIncumbent(incumbent)!==source)throw Error('SYNECHEIA incumbent mismatch');
 const baseTokens=countTokens(incumbent,enc),base={message:incumbent,tokens:baseTokens,baseTokens,applied:false,parentCalls:0};const plan=synecheiaPlan(source);if(!plan)return base;
 let parent:string;try{parent=encodeParent(plan.folded);}catch{return {...base,parentCalls:1};}
 const c=synecheiaCandidate(source,parent,readParent,enc);return c&&c.tokens<baseTokens?{...base,...c,applied:true,parentCalls:1}:{...base,parentCalls:1};
}
