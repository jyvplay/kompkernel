/** X140 EIKON (image): acyclic images of expanded grammar rules.
 * Experimental, UNWIRED. ~gU| / ~gL| apply ASCII case; ~gab| applies
 * simultaneous character substitution a -> b to expanded g, not its wire.
 * Unlike APOTOME this changes characters rather than selecting a substring.
 * Related to morphic grammars, not a new information-theory primitive.
 * Ordinary dictionary controls and native behavior must be tested separately.
 */
import {CHIRON_SCRIPTS,chironInScript,chironParseTape,chironDecode,chironOpsUsed} from './chiron';
import {countTokens,type EncodingName} from './bpe';
export const EIKON_KEY='¶ k=v; ~gU|/~gL| = ASCII uppercase/lowercase of expanded g; ~gab| = replace every a with b in expanded g. Expand recursively; print only.\n';
export const EIKON_OPS=['U','L','_-','-_','/.','./','_ ','- ',' _',' -'];
export interface EikonRule {g:string;v:string}
const cap=20000;
export function eikonImage(s:string,op:string):string{
 if(op==='U')return s.replace(/[a-z]/g,c=>c.toUpperCase());
 if(op==='L')return s.replace(/[A-Z]/g,c=>c.toLowerCase());
 if(op.length!==2||!/^[-_./ a-zA-Z]{2}$/.test(op)||op[0]===op[1])throw Error('EIKON operation');
 return s.split(op[0]).join(op[1]);
}
function expr(s:string){return /^~([^\uD800-\uDFFF])([UL]|[-_./ a-zA-Z]{2})\|/.exec(s);}
export function eikonExpand(rules:EikonRule[],body:string):string{
 if(rules.length>128||rules.some(r=>r.g.length!==1||/[~|§¶\uD800-\uDFFF]/.test(r.g)))throw Error('EIKON rules/domain');
 const map=new Map(rules.map(r=>[r.g,r.v]));if(map.size!==rules.length)throw Error('EIKON duplicate');
 const memo=new Map<string,string>(),active=new Set<string>();
 const expand=(g:string):string=>{
  if(memo.has(g))return memo.get(g)!;
  if(active.has(g))throw Error('EIKON cycle');
  const raw=map.get(g);if(raw===undefined)throw Error('EIKON undefined');
  if(raw.length>100000||/[\uD800-\uDFFF]/.test(raw))throw Error('EIKON domain');
  active.add(g);let out='';
  for(let i=0;i<raw.length;){
   if(raw[i]==='~'){const m=expr(raw.slice(i));if(!m)throw Error('EIKON expression');out+=eikonImage(expand(m[1]),m[2]);i+=m[0].length;}
   else{const c=raw[i++];out+=map.has(c)?expand(c):c;}
   if(out.length>cap)throw Error('EIKON expansion cap');
  }
  active.delete(g);memo.set(g,out);return out;
 };
 for(const r of rules)expand(r.g); // includes unreachable rules
 if(body.length>100000||body.includes('~')||/[\uD800-\uDFFF]/.test(body))throw Error('EIKON body/domain');
 let out='';for(const c of body){out+=map.has(c)?expand(c):c;if(out.length>100000)throw Error('EIKON output cap');}return out;
}
export function eikonDecode(message:string):string{
 if(message.length>100000||!message.startsWith(EIKON_KEY+'§'))throw Error('EIKON contract');
 const wire=message.slice(EIKON_KEY.length),end=wire.indexOf('¶');if(end<2)throw Error('EIKON framing');
 const tape=wire.slice(1,end),script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape.charCodeAt(0)));if(!script)throw Error('EIKON script');
 const used=new Set<string>(),rules:EikonRule[]=[];
 for(let i=0;i<tape.length;){
  const g=tape[i++];if(!chironInScript(script,g.charCodeAt(0))||used.has(g))throw Error('EIKON head');used.add(g);const start=i;
  while(i<tape.length){
   if(tape[i]==='~'){const m=expr(tape.slice(i));if(!m||!chironInScript(script,m[1].charCodeAt(0)))throw Error('EIKON reference');i+=m[0].length;continue;}
   if(chironInScript(script,tape.charCodeAt(i))&&!used.has(tape[i]))break;i++;
  }
  rules.push({g,v:tape.slice(start,i)});if(rules.length>128)throw Error('EIKON rule cap');
 }
 return eikonExpand(rules,wire.slice(end+1));
}
export function eikonParent(message:string){
 const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n','¶ k=v; expand recursively. Print only.\n'].find(s=>message.startsWith(s+'§'));
 if(!pre||message.length>100000)return null;
 const wire=message.slice(pre.length),end=wire.indexOf('¶');if(end<2||wire.includes('~')||/[\uD800-\uDFFF]/.test(wire))return null;
 const tape=wire.slice(1,end),script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape.charCodeAt(0)));if(!script)return null;
 const p=chironParseTape(tape,script),ops=chironOpsUsed(wire);if(!p||!p.length||p.length>128||ops.rep||ops.fill||ops.range||ops.split)return null;
 const rules=p.map(r=>({g:r.glyph,v:r.raw})),body=wire.slice(end+1),target=chironDecode(wire);if(target.length>cap)return null;
 try{if(eikonExpand(rules,body)!==target)return null;}catch{return null;}
 const values=new Map(rules.map(r=>[r.g,chironDecode('§'+tape+'¶'+r.g)]));return {pre,wire,tape,rules,body,target,values,script};
}
/** Greedy best improvement; <=4 passes, <=4096 fully decoded/priced moves.
 * No admission based solely on a local cost proxy. Rejected singles may be
 * paired (top12 proxy pool) to remove a cycle created by either move alone.
 */
export function eikonTrial(message:string,enc:EncodingName='o200k_base'){
 const p=eikonParent(message);if(!p)return null;
 let rules=p.rules;const emit=(rs:EikonRule[])=>EIKON_KEY+'§'+rs.map(r=>r.g+r.v).join('')+'¶'+p.body;
 let bestMessage=emit(rules),tokens=countTokens(bestMessage,enc),probes=0,moves=0,rejected=0,images=0;
 for(let pass=0;pass<4&&probes<4096;pass++){
  const choices:{i:number;v:string;proxy:number}[]=[];let best:{rs:EikonRule[];m:string;n:number}|null=null;
  const test=(rs:EikonRule[])=>{if(probes>=4096)return;probes++;const m=emit(rs);try{if(eikonDecode(m)!==p.target){rejected++;return;}}catch{rejected++;return;}const n=countTokens(m,enc);if(n<(best?.n??tokens))best={rs,m,n};};
  for(let i=0;i<rules.length;i++)for(const r of rules)if(r.g!==rules[i].g)for(const op of EIKON_OPS){
   const v=p.values.get(r.g)!,want=p.values.get(rules[i].g)!;if(v===want||eikonImage(v,op)!==want)continue;
   const raw='~'+r.g+op+'|';if(rules[i].v===raw)continue;
   choices.push({i,v:raw,proxy:countTokens(raw,enc)-countTokens(rules[i].v,enc)});
   test(rules.map((x,j)=>j===i?{g:x.g,v:raw}:x));
  }
  const pool=choices.sort((a,b)=>a.proxy-b.proxy||a.i-b.i||a.v.localeCompare(b.v)).slice(0,12);
  for(let a=0;a<pool.length;a++)for(let b=a+1;b<pool.length;b++)if(pool[a].i!==pool[b].i)test(rules.map((r,i)=>i===pool[a].i?{g:r.g,v:pool[a].v}:i===pool[b].i?{g:r.g,v:pool[b].v}:r));
  if(best===null)break;
  const win=best as {rs:EikonRule[];m:string;n:number};rules=win.rs;bestMessage=win.m;tokens=win.n;moves++;
 }
 for(const r of rules)images+=(r.v.match(/~/g)??[]).length;
 return {message:bestMessage,tokens,baseTokens:countTokens(message,enc),target:p.target,probes,moves,rejected,images};
}
export function eikonFromFrontier(message:string,enc:EncodingName='o200k_base'){
 const r=eikonTrial(message,enc);return r&&r.tokens<r.baseTokens?r:null;
}
