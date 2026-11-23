/** X163 LEXARITHMOS: exact grammatical numeral transduction, optional.
 * English cardinal spelling is a value grammar, not digit regrouping, a
 * finite-difference table, a slug, or an external number-word dictionary.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const LEXARITHMOS_KEY='Decode first. Expand ~N (a tilde followed by digits) into lowercase British English cardinal words: hyphenate tens-units, use "and" after hundreds with a remainder and after thousands only when the remainder is below 100; no commas. Preserve everything else; print only.\n';
const CAP=50000;
const SMALL='zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS='zero ten twenty thirty forty fifty sixty seventy eighty ninety'.split(' ');
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('LEXARITHMOS domain');}
export function lexarithmosWords(n:number):string{
 if(!Number.isInteger(n)||n<0||n>999999)throw Error('LEXARITHMOS number');
 if(n<20)return SMALL[n];if(n<100)return TENS[Math.floor(n/10)]+(n%10?'-'+SMALL[n%10]:'');
 if(n<1000)return SMALL[Math.floor(n/100)]+' hundred'+(n%100?' and '+lexarithmosWords(n%100):'');
 const r=n%1000;return lexarithmosWords(Math.floor(n/1000))+' thousand'+(r?(r<100?' and ':' ')+lexarithmosWords(r):'');
}
const VALUES=new Map([...SMALL.map((s,i)=>[s,i] as const),...TENS.slice(2).map((s,i)=>[s,(i+2)*10] as const)]);
const WORDS=[...new Set([...SMALL,...TENS,'hundred','thousand','and'])].sort((a,b)=>b.length-a.length).join('|');
const phrase=()=>new RegExp('(?<![A-Za-z0-9_-])(?:'+WORDS+')(?:[ -](?:'+WORDS+'))*(?![A-Za-z0-9_-])','g');
function value(s:string,min=100){let n=0,group=0;for(const word of s.split(/[ -]/)){
 if(word==='and')continue;if(word==='hundred')group*=100;else if(word==='thousand'){n+=group*1000;group=0;}else {const v=VALUES.get(word);if(v===undefined)return null;group+=v;}
 }n+=group;return n>=min&&n<=999999&&lexarithmosWords(n)===s?n:null;}
export function lexarithmosUndo(folded:string){domain(folded);const out=folded.replace(/~([0-9]+)/g,(_m,d:string)=>{if(!/^(0|[1-9][0-9]{0,5})$/.test(d))throw Error('LEXARITHMOS marker');return lexarithmosWords(Number(d));});domain(out);return out;}
export function lexarithmosPlan(source:string){try{domain(source);if(/~[0-9]/.test(source))return null;let sites=0;
 const folded=source.replace(phrase(),(s)=>{const n=value(s);if(n===null)return s;sites++;return '~'+n;});
 if(!sites||lexarithmosUndo(folded)!==source)return null;return {folded,sites};}catch{return null;}}
export function lexarithmosRead(message:string,parent:(s:string)=>string){domain(message);if(!message.startsWith(LEXARITHMOS_KEY))throw Error('LEXARITHMOS contract');return lexarithmosUndo(parent(message.slice(LEXARITHMOS_KEY.length)));}
export function lexarithmosFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(incumbent.startsWith(LEXARITHMOS_KEY)||incumbent.startsWith(LEXARITHMOS_MEMORY_KEY)||incumbent.startsWith(LEXARITHMOS_MEMORY_KEY_CARDINAL))throw Error('LEXARITHMOS reserved incumbent envelope');if(readIncumbent(incumbent)!==source)throw Error('LEXARITHMOS incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const p=lexarithmosPlan(source);if(!p)return best;
 const admit=(message:string,read:(s:string)=>string)=>{try{const tokens=countTokens(message,enc);if(tokens<best.tokens&&lexarithmosRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* Refuse. */}};
 admit(LEXARITHMOS_KEY+p.folded,s=>s);best.parentCalls=1;try{admit(LEXARITHMOS_KEY+encodeParent(p.folded),readParent);}catch{/* Retain verified incumbent/direct. */}return best;
}

/** Contextual arm: a bare caret reuses the last literal digit run.
 * Explicit operands do not update that literal-history state. No source data
 * is consulted by the reader; every determining digit remains in the wire.
 */
export const LEXARITHMOS_MEMORY_KEY=LEXARITHMOS_KEY.replace('Expand ~N (a tilde followed by digits)', 'Expand ^N').replace('Preserve everything else;', 'A bare ^ uses the last literal digit run; ^d spells its digits individually with comma-space separators. Operands do not update literal memory. Preserve everything else;');
export const LEXARITHMOS_MEMORY_KEY_CARDINAL=LEXARITHMOS_MEMORY_KEY.replace('; ^d spells its digits individually with comma-space separators','');
export function lexarithmosMemoryKey(digitLists:number){return digitLists?LEXARITHMOS_MEMORY_KEY:LEXARITHMOS_MEMORY_KEY_CARDINAL;}
export function lexarithmosMemoryUndo(folded:string){domain(folded);let last:string|null=null;
 const out=folded.replace(/\^(d|[0-9]*)|[0-9]+/g,(whole,d:string|undefined)=>{
  if(d===undefined){last=whole;return whole;}
  if(d==='d'){if(last===null||last.length>100)throw Error('LEXARITHMOS digits');return [...last].map(c=>SMALL[Number(c)]).join(', ');}
  const digits=d||last;if(digits===null||!(/^(0|[1-9][0-9]{0,5})$/.test(digits)))throw Error('LEXARITHMOS operand');return lexarithmosWords(Number(digits));
 });domain(out);return out;
}
const digitPhrase='(?<![A-Za-z0-9_-])(?:'+SMALL.slice(0,10).join('|')+')(?:, (?:'+SMALL.slice(0,10).join('|')+'))+(?![A-Za-z0-9_-])';
export function lexarithmosMemoryPlan(source:string){try{domain(source);if(source.includes('^'))return null;let last:string|null=null,sites=0,reuses=0,digitLists=0;
 const scan=new RegExp(digitPhrase+'|'+phrase().source+'|[0-9]+','g');const folded=source.replace(scan,(s)=>{
  if(/^[0-9]+$/.test(s)){last=s;return s;}
  if(s.includes(', ')){if(last!==null&&last.length<=100&&[...last].map(c=>SMALL[Number(c)]).join(', ')===s){sites++;reuses++;digitLists++;return '^d';}return s;}
  const n=value(s,0);if(n===null)return s;if(String(n)===last){sites++;reuses++;return '^';}if(n<100)return s;sites++;return '^'+n;
 });if(!sites||!reuses||lexarithmosMemoryUndo(folded)!==source)return null;return {folded,sites,reuses,digitLists};}catch{return null;}}
export function lexarithmosMemoryRead(message:string,parent:(s:string)=>string){domain(message);const key=message.startsWith(LEXARITHMOS_MEMORY_KEY)?LEXARITHMOS_MEMORY_KEY:message.startsWith(LEXARITHMOS_MEMORY_KEY_CARDINAL)?LEXARITHMOS_MEMORY_KEY_CARDINAL:null;if(key===null)throw Error('LEXARITHMOS memory contract');const folded=parent(message.slice(key.length));if(key===LEXARITHMOS_MEMORY_KEY_CARDINAL&&folded.includes('^d'))throw Error('LEXARITHMOS undeclared digit operation');return lexarithmosMemoryUndo(folded);}

export function lexarithmosMemoryFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(incumbent.startsWith(LEXARITHMOS_KEY)||incumbent.startsWith(LEXARITHMOS_MEMORY_KEY)||incumbent.startsWith(LEXARITHMOS_MEMORY_KEY_CARDINAL))throw Error('LEXARITHMOS reserved incumbent envelope');if(readIncumbent(incumbent)!==source)throw Error('LEXARITHMOS incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const p=lexarithmosMemoryPlan(source);if(!p)return best;
 const admit=(message:string,read:(s:string)=>string)=>{try{const tokens=countTokens(message,enc);if(tokens<best.tokens&&lexarithmosMemoryRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* Refuse. */}};
 const key=lexarithmosMemoryKey(p.digitLists);admit(key+p.folded,s=>s);best.parentCalls=1;try{admit(key+encodeParent(p.folded),readParent);}catch{/* Retain verified incumbent/direct. */}return best;
}

/** Independent arms against the same verified incumbent; do not treat one arm
 * as an incumbent for a reader that cannot decode that arm's envelope. */
export function lexarithmosBestFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 const a=lexarithmosFromFrontier(source,incumbent,readIncumbent,encodeParent,readParent,enc);
 const b=lexarithmosMemoryFromFrontier(source,incumbent,readIncumbent,encodeParent,readParent,enc);
 return {...(b.tokens<a.tokens?b:a),parentCalls:a.parentCalls+b.parentCalls};
}
