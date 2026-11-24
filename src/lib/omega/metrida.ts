/** X171 METRIDA: length-sum-constrained ambiguous word aliases.
 * Experimental/unwired. Bounded constraint decoding, not native-model proof.
 * Each marker has two words; ONE in-band sum per marked line identifies the
 * assignment only when unique. Unlike DEIKTIS there is no occurrence-choice
 * tape; unlike KYKLOS there is no temporal cursor or repeating schedule.
 */
import {countTokens,type EncodingName} from './bpe';
import {isUtf8TransportStable} from './utf8-wire';
export const METRIDA_CAP=50000;
export const METRIDA_KEY='Decode payload first. First line: JSON rows [marker,word1,word2]. On each ~N: line remove that prefix; replace maximal ASCII-letter marker words by their alternatives so the SUM of replacement word lengths equals N. Use the unique assignment; never rescan replacements. Other lines are literal. Preserve every other character; print only.\n';
type Rule=[string,string,string];
function domain(s:string){if(s.length>METRIDA_CAP||!isUtf8TransportStable(s))throw Error('METRIDA domain');}
function rulesOf(x:unknown){if(!Array.isArray(x)||!x.length||x.length>4)throw Error('METRIDA rows');const rules=new Map<string,[string,string]>();
 for(const row of x){if(!Array.isArray(row)||row.length!==3||!row.every(w=>typeof w==='string'&&/^[A-Za-z]{1,100}$/.test(w))||rules.has(row[0])||row[1].length===row[2].length)throw Error('METRIDA row');rules.set(row[0],[row[1],row[2]]);}return rules;}
/** Exhaustive bounded sum solver: at most 8 sites / 256 assignments.
 * Returns null on zero OR multiple solutions, never picks one arbitrarily. */
function solve(options:[string,string][],sum:number):string[]|null{
 if(!options.length||options.length>8)return null;let solution:string[]|null=null;
 for(let mask=0;mask<2**options.length;mask++){let n=0;for(let i=0;i<options.length;i++)n+=options[i][(mask>>>i)&1].length;if(n!==sum)continue;if(solution!==null)return null;solution=options.map((o,i)=>o[(mask>>>i)&1]);}return solution;
}
export function metridaUndo(folded:string){domain(folded);const at=folded.indexOf('\n');if(at<0)throw Error('METRIDA frame');const rules=rulesOf(JSON.parse(folded.slice(0,at)));let units=0;
 const out=folded.slice(at+1).split('\n').map(line=>{if(!line.startsWith('~')){units+=line.length+1;if(units>METRIDA_CAP+1)throw Error('METRIDA expansion');return line;}
  const m=/^~(0|[1-9][0-9]{0,3}):/.exec(line);if(!m)throw Error('METRIDA sum');const body=line.slice(m[0].length),options:[string,string][]=[];for(const w of body.match(/[A-Za-z]+/g)??[]){const o=rules.get(w);if(o)options.push(o);if(options.length>8)throw Error('METRIDA sites');}
  const result=solve(options,Number(m[1]));if(!result)throw Error('METRIDA nonunique');let cursor=0;const restored=body.replace(/[A-Za-z]+/g,w=>rules.has(w)?result[cursor++]:w);units+=restored.length+1;if(units>METRIDA_CAP+1)throw Error('METRIDA expansion');return restored;
 }).join('\n');domain(out);return out;}
export function metridaPlans(source:string,enc:EncodingName='o200k_base'){
 domain(source);if(source.includes('~'))return [];const words=source.match(/[A-Za-z]+/g)??[],freq=new Map<string,number>();for(const w of words)freq.set(w,(freq.get(w)??0)+1);
 const top=[...freq].filter(([w,n])=>n>=3&&w.length<=100).sort((a,b)=>b[0].length*b[1]-a[0].length*a[1]).slice(0,16).map(([w])=>w);const pairs:{a:string;b:string;score:number}[]=[];
 for(let i=0;i<top.length;i++)for(let j=i+1;j<top.length;j++){const a=top[i],b=top[j];if(a.length!==b.length)pairs.push({a,b,score:Math.min(freq.get(a)!,freq.get(b)!)*(a.length+b.length-2)});}pairs.sort((a,b)=>b.score-a.score);
 const markers=['Q','Z','X','J'].filter(w=>!freq.has(w));if(!markers.length)return [];const groups:Rule[][]=pairs.slice(0,8).map(p=>[[markers[0],p.a,p.b]]);const used=new Set<string>(),group:Rule[]=[];
 for(const p of pairs){if(group.length>=markers.length||used.has(p.a)||used.has(p.b))continue;used.add(p.a);used.add(p.b);group.push([markers[group.length],p.a,p.b]);if(group.length>1)groups.push(group.map(r=>[...r]));}
 const plans:{rules:number;folded:string;message:string;tokens:number}[]=[];
 for(const rows of groups){const rules=rulesOf(rows),byWord=new Map<string,string>();for(const [m,a,b] of rows){byWord.set(a,m);byWord.set(b,m);}let sites=0;
  const body=source.split('\n').map(line=>{const matches=[...line.matchAll(/[A-Za-z]+/g)],selected=matches.map((m,i)=>byWord.has(m[0])?i:-1).filter(i=>i>=0).slice(0,8);
   while(selected.length){const opts=selected.map(i=>rules.get(byWord.get(matches[i][0])!)!),sum=selected.reduce((s,i)=>s+matches[i][0].length,0);if(solve(opts,sum)){const chosen=new Set(selected);let n=0;sites+=selected.length;return '~'+sum+':'+line.replace(/[A-Za-z]+/g,w=>chosen.has(n++)?byWord.get(w)!:w);}selected.pop();}return line;}).join('\n');
  if(!sites)continue;const folded=JSON.stringify(rows)+'\n'+body;if(folded.length>METRIDA_CAP||plans.some(p=>p.folded===folded))continue;if(metridaUndo(folded)!==source)throw Error('METRIDA inverse');const message=METRIDA_KEY+folded;plans.push({rules:rows.length,folded,message,tokens:countTokens(message,enc)});
 }return plans.sort((a,b)=>a.tokens-b.tokens||a.rules-b.rules);
}
export function metridaRead(message:string,parent:(s:string)=>string=s=>s){if(message.length>METRIDA_CAP+1000||!isUtf8TransportStable(message)||!message.startsWith(METRIDA_KEY))throw Error('METRIDA wire');return metridaUndo(parent(message.slice(METRIDA_KEY.length)));}
export function metridaFromFrontier(source:string,incumbent:string,readIncumbent:(s:string)=>string,encodeParent:(s:string)=>string,readParent:(s:string)=>string,enc:EncodingName='o200k_base'){
 domain(source);if(incumbent.length>METRIDA_CAP+1000||!isUtf8TransportStable(incumbent)||incumbent.startsWith(METRIDA_KEY)||readIncumbent(incumbent)!==source)throw Error('METRIDA incumbent');let best={message:incumbent,tokens:countTokens(incumbent,enc),applied:false,parentCalls:0};const plans=metridaPlans(source,enc);
 const admit=(message:string,read:(s:string)=>string)=>{try{if(message.length>METRIDA_CAP+1000)return;const tokens=countTokens(message,enc);if(tokens<best.tokens&&metridaRead(message,read)===source)best={...best,message,tokens,applied:true};}catch{/* verified fallback */}};
 for(const p of plans)admit(p.message,s=>s);if(plans.length){best.parentCalls++;try{admit(METRIDA_KEY+encodeParent(plans[0].folded),readParent);}catch{/* verified fallback */}}return best;
}
