/** X139 APOTOME (a cut): acyclic prefix/suffix views of expanded rules.
 * Experimental and unwired. Forward references are allowed only inside explicit
 * ~gN| slice expressions; ordinary tape references retain CHIRON's framing.
 * This is a collage-system operation, not a new compression-theory primitive.
 * Greedy best-improvement full-message search, <=4 passes and 4096 probes.
 * No native-model claim. Parent source inverses must be verified separately.
 */
import {countTokens,type EncodingName} from './bpe';
import {CHIRON_SCRIPTS,chironInScript,chironParseTape,chironDecode,chironOpsUsed} from './chiron';
export const APOTOME_KEY='¶ k=v; ~gN| in definitions means first N characters of expanded g (negative N: last -N). Expand recursively; print only.\n';
export interface ApotomeRule {g:string;v:string}
const sliceAt=(s:string)=>/^~([^\uD800-\uDFFF])(-?[1-9]\d{0,4})\|/.exec(s);
function parse(wire:string){
 if(wire.length>100000||!wire.startsWith('§'))throw Error('APOTOME framing');
 const cut=wire.indexOf('¶');if(cut<2)throw Error('APOTOME separator');
 const tape=wire.slice(1,cut),script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape.charCodeAt(0)));
 if(!script)throw Error('APOTOME alphabet');
 const used=new Set<string>(),rules:ApotomeRule[]=[];
 for(let i=0;i<tape.length;){
  const g=tape[i++];if(!chironInScript(script,g.charCodeAt(0))||used.has(g))throw Error('APOTOME definition');
  used.add(g);const start=i;
  while(i<tape.length){
   if(tape[i]==='~'){const m=sliceAt(tape.slice(i));if(!m||!chironInScript(script,m[1].charCodeAt(0)))throw Error('APOTOME slice');i+=m[0].length;continue;}
   if(chironInScript(script,tape.charCodeAt(i))&&!used.has(tape[i]))break;
   i++;
  }
  rules.push({g,v:tape.slice(start,i)});if(rules.length>128)throw Error('APOTOME rules cap');
 }
 return {rules,body:wire.slice(cut+1)};
}
export function apotomeExpand(rules:ApotomeRule[],body:string){
 const map=new Map(rules.map(r=>[r.g,r.v])),memo=new Map<string,string>(),active=new Set<string>();
 if(map.size!==rules.length||rules.length>128)throw Error('APOTOME duplicate/cap');
 const expand=(g:string):string=>{
  const found=memo.get(g);if(found!==undefined)return found;
  const raw=map.get(g);if(raw===undefined)throw Error('APOTOME undefined reference');
  if(active.has(g))throw Error('APOTOME cycle');active.add(g);let out='';
  for(let i=0;i<raw.length;){
   const c=raw[i];if(c==='~'){
    const m=sliceAt(raw.slice(i));if(!m)throw Error('APOTOME malformed slice');
    const n=Number(m[2]),v=expand(m[1]);if(Math.abs(n)>v.length)throw Error('APOTOME bounds');
    out+=n>0?v.slice(0,n):v.slice(n);i+=m[0].length;
   }else{out+=map.has(c)?expand(c):c;i++;}
   if(out.length>20000||/[\uD800-\uDFFF]/.test(out))throw Error('APOTOME expansion cap/domain');
  }
  active.delete(g);memo.set(g,out);return out;
 };
 // Check even unreachable rules: no hidden cycle is accepted.
 for(const r of rules)expand(r.g);
 let out='';for(const c of body){out+=map.has(c)?expand(c):c;if(out.length>100000)throw Error('APOTOME output cap');}
 return out;
}
export function apotomeDecode(message:string){
 if(!message.startsWith(APOTOME_KEY))throw Error('APOTOME contract');
 const p=parse(message.slice(APOTOME_KEY.length));return apotomeExpand(p.rules,p.body);
}
export function apotomeTrial(message:string,enc:EncodingName='o200k_base'){
 const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(p=>message.startsWith(p+'§'));
 if(!pre||message.length>100000)return null;
 const wire=message.slice(pre.length),cut=wire.indexOf('¶'),tape=wire.slice(1,cut);
 if(cut<2||wire.includes('~')||/[\uD800-\uDFFF]/.test(wire))return null;
 const script=CHIRON_SCRIPTS.find(s=>chironInScript(s,tape.charCodeAt(0)));if(!script)return null;
 const p=chironParseTape(tape,script),ops=chironOpsUsed(wire);
 if(!p||!p.length||p.length>128||ops.rep||ops.fill||ops.range||ops.split)return null;
 let rules=p.map(r=>({g:r.glyph,v:r.raw}));const body=wire.slice(cut+1),target=chironDecode(wire);
 if(target.length>20000)return null;
 try{if(apotomeExpand(rules,body)!==target)return null;}catch{return null;}
 const values=new Map(rules.map(r=>[r.g,chironDecode('§'+tape+'¶'+r.g)]));
 const emit=(rs:ApotomeRule[])=>APOTOME_KEY+'§'+rs.map(r=>r.g+r.v).join('')+'¶'+body;
 let candidate=emit(rules),tokens=countTokens(candidate,enc),probes=0,moves=0,cycles=0;
 for(let pass=0;pass<4&&probes<4096;pass++){
  let best:{rules:ApotomeRule[];message:string;tokens:number}|null=null;
  const choices:{index:number;raw:string;proxy:number}[]=[];
  for(let i=0;i<rules.length&&probes<4096;i++)for(const r of rules){
   if(probes>=4096)break;if(r.g===rules[i].g)continue;
   const v=values.get(r.g)!,want=values.get(rules[i].g)!;
   if(!want.length||want.length>=v.length)continue;
   for(const sign of [1,-1]){
    if(probes>=4096)break;
    if(!(sign===1?v.startsWith(want):v.endsWith(want)))continue;
    const replacement='~'+r.g+(sign*want.length)+'|';if(replacement===rules[i].v)continue;
    choices.push({index:i,raw:replacement,proxy:countTokens(replacement,enc)-countTokens(rules[i].v,enc)});
    const rs=rules.map((x,j)=>j===i?{g:x.g,v:replacement}:x),m=emit(rs);probes++;
    try{if(apotomeDecode(m)!==target)continue;}catch{cycles++;continue;}
    const n=countTokens(m,enc);if(n<tokens&&(!best||n<best.tokens))best={rules:rs,message:m,tokens:n};
   }
  }
  // Two changes can remove a dependency that made either isolated view cyclic.
  // Keep a bounded independently ranked pair pool, including rejected singles.
  const pairPool=choices.sort((a,b)=>a.proxy-b.proxy||a.index-b.index||a.raw.localeCompare(b.raw)).slice(0,12);
  for(let x=0;x<pairPool.length&&probes<4096;x++)for(let y=x+1;y<pairPool.length&&probes<4096;y++){
   const a=pairPool[x],b=pairPool[y];if(a.index===b.index)continue;
   const rs=rules.map((r,i)=>i===a.index?{g:r.g,v:a.raw}:i===b.index?{g:r.g,v:b.raw}:r),m=emit(rs);probes++;
   try{if(apotomeDecode(m)!==target)continue;}catch{cycles++;continue;}
   const n=countTokens(m,enc);if(n<tokens&&(!best||n<best.tokens))best={rules:rs,message:m,tokens:n};
  }
  if(!best)break;rules=best.rules;candidate=best.message;tokens=best.tokens;moves++;
 }
 return {message:candidate,tokens,baseTokens:countTokens(message,enc),target,probes,moves,cycles,layerExact:apotomeDecode(candidate)===target};
}
export function apotomeFromFrontier(message:string,enc:EncodingName='o200k_base'){
 const r=apotomeTrial(message,enc);return r&&r.moves>0&&r.tokens<r.baseTokens?r:null;
}
