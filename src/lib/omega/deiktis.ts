/** X165 DEIKTIS (pointer): suffix-context-addressed copy lengths.
 * Classical LZP ancestry. Unlike MNEMA's explicit lexical prefix, the address is
 * the last k decoded Unicode scalars; unlike CTXCOPY, no earlier chat is read.
 * Experimental/unwired. Exact program inversion is NOT native-chat evidence.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const DEIKTIS_CAP=50000;
export const DEIKTIS_CONTEXTS=[4,8,16] as const;
function domain(s:string){if(s.length>DEIKTIS_CAP||!isUtf8TransportStable(s))throw Error('DEIKTIS domain');}
function width(k:number){if(!DEIKTIS_CONTEXTS.includes(k as 4|8|16))throw Error('DEIKTIS context');}
export function deiktisKey(k:number){width(k);return `Decode first. Scan left to right: ~N; copies N Unicode code points following the latest earlier occurrence of the preceding ${k} output code points, entirely within existing output. Preserve everything else; print only.\n`;}
/** Table entries are context END offsets. The current context is queried before
 * being inserted: the pointer always addresses a strictly earlier context. */
export function deiktisUndo(folded:string,k:number):string{
 domain(folded);width(k);const out:string[]=[],last=new Map<string,number>();let units=0;
 const append=(s:string[])=>{for(const c of s){if(out.length>=k)last.set(out.slice(-k).join(''),out.length);out.push(c);units+=c.length;if(units>DEIKTIS_CAP)throw Error('DEIKTIS output cap');}};
 const input=[...folded];for(let i=0;i<input.length;){
  if(input[i]==='~'&&/^[0-9]$/.test(input[i+1]??'')){
   const m=/^~([1-9][0-9]{0,3});/.exec(input.slice(i,i+7).join(''));if(!m)throw Error('DEIKTIS reference');const n=Number(m[1]);
   const p=out.length>=k?last.get(out.slice(-k).join('')):undefined;
   if(n>4096||p===undefined||p+n>out.length)throw Error('DEIKTIS unavailable copy');
   const copy=out.slice(p,p+n);append(copy);i+=m[0].length;
  }else append([input[i++]]);
 }return out.join('');
}
export function deiktisPlan(source:string,k:number,minLength:number,enc:EncodingName='o200k_base'){
 domain(source);width(k);if(![12,32,64,128].includes(minLength))throw Error('DEIKTIS min length');if(/~[0-9]/.test(source))return null;
 const a=[...source],last=new Map<string,number>(),prior=new Int32Array(a.length).fill(-1);
 for(let i=k;i<a.length;i++){const c=a.slice(i-k,i).join('');prior[i]=last.get(c)??-1;last.set(c,i);}
 let folded='',sites=0,copied=0;for(let i=0;i<a.length;){const j=prior[i];let n=0;if(j>=0)while(n<4096&&j+n<i&&i+n<a.length&&a[j+n]===a[i+n])n++;
  const ref='~'+n+';';if(n>=minLength&&countTokens(a.slice(i,i+n).join(''),enc)>countTokens(ref,enc)){folded+=ref;i+=n;sites++;copied+=n;}else folded+=a[i++];
 }
 if(!sites)return null;if(deiktisUndo(folded,k)!==source)throw Error('DEIKTIS inverse');const contract=deiktisKey(k);return {k,minLength,folded,contract,sites,copied,tokens:countTokens(contract+folded,enc)};
}
export function deiktisPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);const plans:NonNullable<ReturnType<typeof deiktisPlan>>[]=[];for(const k of DEIKTIS_CONTEXTS)for(const min of [12,32,64,128]){const p=deiktisPlan(source,k,min,enc);if(p&&!plans.some(q=>q.k===p.k&&q.folded===p.folded))plans.push(p);}return plans.sort((a,b)=>a.tokens-b.tokens||a.k-b.k||a.minLength-b.minLength);
}
export function deiktisRead(message:string,parent:(s:string)=>string){if(message.length>DEIKTIS_CAP+1000||!isUtf8TransportStable(message))throw Error('DEIKTIS wire');for(const k of DEIKTIS_CONTEXTS){const key=deiktisKey(k);if(message.startsWith(key))return deiktisUndo(parent(message.slice(key.length)),k);}throw Error('DEIKTIS contract');}
export function deiktisFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(incumbent.length>DEIKTIS_CAP+1000)throw Error('DEIKTIS incumbent cap');if(DEIKTIS_CONTEXTS.some(k=>incumbent.startsWith(deiktisKey(k)))||!isUtf8TransportStable(incumbent)||readIncumbent(incumbent)!==source)throw Error('DEIKTIS incumbent');
 let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0,k:0,minLength:0};const plans=deiktisPlans(source,enc);
 const admit=(message:string,p:NonNullable<ReturnType<typeof deiktisPlan>>,read:(s:string)=>string)=>{try{if(message.length>DEIKTIS_CAP+1000||!isUtf8TransportStable(message))return;const tokens=countTokens(message,enc);if(tokens<best.tokens&&deiktisRead(message,read)===source)best={...best,message,tokens,applied:true,k:p.k,minLength:p.minLength};}catch{/* exact refusal */}};
 for(const p of plans)admit(p.contract+p.folded,p,s=>s);
 // Raw-ranked and sparse-long-copy arms retain early independence. ≤2 parent calls.
 const arms=plans.length?[plans[0]]:[];const sparse=plans.find(p=>p.minLength>=64&&p.folded!==arms[0]?.folded);if(sparse)arms.push(sparse);
 for(const p of arms){best.parentCalls++;try{admit(p.contract+encodeParent(p.folded),p,readParent);}catch{/* retain verified candidate */}}return best;
}
