/** X164 HYSTERON (later): forward comprehension-binder spelling references.
 * A marker can precede the retained `for NAME in` declaration. No explicit
 * dictionary, lexical-recency lookup, or XML closing-name stack is used.
 * Bounded Python lexical subset, not Python evaluation or alpha equivalence.
 * Optional; complete-message admission; native behavior NOT certified.
 */
import {countTokens,type EncodingName} from '../../../src/lib/omega/bpe';
import {isUtf8TransportStable} from '../../../src/lib/omega/utf8-wire';
export const HYSTERON_KEY='Decode first. In Python comprehensions, § copies the for-variable name from the same brackets. Preserve everything else; print only.\n';
const CAP=50000;
type Token={s:string,start:number,end:number};type Frame={start:number,end:number};
function domain(s:string){if(s.length>CAP||!isUtf8TransportStable(s))throw Error('HYSTERON domain');}
/** Quoted strings (including triple quotes) and comments are opaque. */
function lex(s:string){domain(s);const tokens:Token[]=[],frames:Frame[]=[],stack:{index:number,char:string}[]=[];
 for(let i=0;i<s.length;){const start=i,c=s[i];
  if(c==='#'){const end=s.indexOf('\n',i);i=end<0?s.length:end;continue;}
  if(c==='"'||c==="'"){const q=s.startsWith(c.repeat(3),i)?c.repeat(3):c;i+=q.length;let closed=false;while(i<s.length){if(s[i]==='\\'){i+=2;continue;}if(s.startsWith(q,i)){i+=q.length;closed=true;break;}if(q.length===1&&(s[i]==='\n'||s[i]==='\r'))throw Error('HYSTERON unterminated string');i++;}if(!closed||i>s.length)throw Error('HYSTERON string');continue;}
  if(/[A-Za-z_]/.test(c)){i++;while(i<s.length&&/[A-Za-z_0-9]/.test(s[i]))i++;tokens.push({s:s.slice(start,i),start,end:i});continue;}
  i++;if(!'()[]{}§'.includes(c))continue;
  const index=tokens.length;tokens.push({s:c,start,end:i});
  if('([{'.includes(c)){if(stack.length>=128)throw Error('HYSTERON depth');stack.push({index,char:c});}
  else if(')]}'.includes(c)){const open=stack.pop();if(!open||'([{'.indexOf(open.char)!==')]}'.indexOf(c))throw Error('HYSTERON brackets');frames.push({start:open.index,end:index});}
 }
 if(stack.length)throw Error('HYSTERON unclosed brackets');return {tokens,frames};
}
function scopes(tokens:Token[],frames:Frame[]){const out:{start:number,end:number,binder:number,name:string}[]=[];
 for(const f of frames){let depth=0,at=-1,allFor=0;for(let i=f.start+1;i<f.end;i++){const t=tokens[i].s;if(t==='for'){allFor++;if(depth===0)at=i;}if('([{'.includes(t)&&t.length===1)depth++;else if(')]}'.includes(t)&&t.length===1)depth--;}
  if(allFor!==1||at<0)continue;const name=tokens[at+1]?.s;if(!name||!/^[_A-Za-z][_A-Za-z0-9]*$/.test(name)||tokens[at+2]?.s!=='in')continue;
  // Lexer omits operators: ensure the declaration is literally `for NAME in`.
  out.push({start:f.start,end:f.end,binder:at+1,name});
 }return out;
}
function transform(source:string,fold:boolean){const {tokens,frames}=lex(source);const ss=scopes(tokens,frames),edits:{start:number,end:number,text:string}[]=[];
 for(const scope of ss){const forTok=tokens[scope.binder-1],binder=tokens[scope.binder],inTok=tokens[scope.binder+1];if(!/^for[ \t\r\n]+[_A-Za-z][_A-Za-z0-9]*[ \t\r\n]+in$/.test(source.slice(forTok.start,inTok.end)))continue;
  for(let i=scope.start+1;i<scope.end;i++){const t=tokens[i];if(i===scope.binder)continue;if(t.s===(fold?scope.name:'§'))edits.push({start:t.start,end:t.end,text:fold?'§':scope.name});}
 }
 edits.sort((a,b)=>a.start-b.start);let out='',at=0;for(const e of edits){if(e.start<at)throw Error('HYSTERON overlap');out+=source.slice(at,e.start)+e.text;at=e.end;if(out.length>CAP)throw Error('HYSTERON expansion');}out+=source.slice(at);domain(out);
 if(!fold&&tokens.filter(t=>t.s==='§').length!==edits.length)throw Error('HYSTERON unbound marker');return {text:out,sites:edits.length,scopes:ss.length};
}
export function hysteronUndo(folded:string){return transform(folded,false).text;}
export function hysteronPlan(source:string){try{domain(source);if(source.includes('§'))return null;const p=transform(source,true);if(!p.sites||hysteronUndo(p.text)!==source)return null;return {folded:p.text,sites:p.sites,scopes:p.scopes};}catch{return null;}}
export function hysteronRead(message:string,parent:(s:string)=>string){domain(message);if(!message.startsWith(HYSTERON_KEY))throw Error('HYSTERON contract');return hysteronUndo(parent(message.slice(HYSTERON_KEY.length)));}
export function hysteronFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);domain(incumbent);if(incumbent.startsWith(HYSTERON_KEY)||readIncumbent(incumbent)!==source)throw Error('HYSTERON incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const p=hysteronPlan(source);if(!p)return best;
 const admit=(message:string,read:(s:string)=>string)=>{try{const tokens=countTokens(message,enc);if(tokens<best.tokens&&hysteronRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* strict refusal */}};
 admit(HYSTERON_KEY+p.folded,s=>s);best.parentCalls=1;try{admit(HYSTERON_KEY+encodeParent(p.folded),readParent);}catch{/* retain incumbent */}return best;
}
