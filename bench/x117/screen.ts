/** X117 raw mechanism screens. No parent encode; exact inverse required for a price.
 * Run: bash bench/x15/run.sh bench/x117/screen.ts [lane-file] [out-prefix]
 * These are hypotheses, not shipped codecs. Every transform carries its whole key.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc = 'o200k_base' as const;
const T = (s: string) => countTokens(s, enc);
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x109/lanes29.txt','utf8').split('\n').filter(Boolean);
const out = process.argv[3] ?? 'bench/x117/receipts/screen';
type Trial = { wire: string; exact: boolean; hits: number; note?: string };
const no = (text: string, note: string): Trial => ({ wire:text, exact:false, hits:0, note });
const check = (text:string, wire:string, decode:(s:string)=>string, hits:number): Trial => ({wire,hits,exact:decode(wire)===text});

// A. Sparse case channel: lowercase ASCII letters; transmit ONLY unpredictable
// capitals as word/letter coordinates. Unlike X114 sentence-case, no sentence
// heuristic is trusted; unlike STENTOR, isolated capitals and camel humps count.
const CASE_KEY='Case: body is ASCII-lowercased. Uppercase the letter at each listed 0-based [line,word,letter]; words split on spaces, lines on LF.';
function caseMask(text:string):Trial {
  const coords:number[][]=[];
  const body=text.split('\n').map((line,li)=>line.split(' ').map((w,wi)=>[...w].map((c,ci)=>{
    if(c>='A'&&c<='Z'){coords.push([li,wi,ci]);return c.toLowerCase();}return c;
  }).join('')).join(' ')).join('\n');
  const wire=CASE_KEY+'\n'+JSON.stringify(coords)+'\n'+body;
  return check(text,wire,w=>{const a=w.indexOf('\n'),b=w.indexOf('\n',a+1);const cs=JSON.parse(w.slice(a+1,b)) as number[][];const ls=w.slice(b+1).split('\n').map(l=>l.split(' '));for(const [li,wi,ci] of cs){const x=ls[li]?.[wi];if(x===undefined||ci>=x.length)throw Error('bad case coordinate');ls[li]![wi]=x.slice(0,ci)+x[ci]!.toUpperCase()+x.slice(ci+1);}return ls.map(l=>l.join(' ')).join('\n');},coords.length);
}
// B. Identifier case-shape dictionary: body lowercases ASCII identifiers; a
// shared bit shape per distinct lowercase spelling restores exact humps. This is
// not a stemmer and does not split or rename identifiers.
const SHAPE_KEY='Ids: body ASCII identifiers are lowercased. For each shape=mask row, uppercase letters at 1 bits (mask LSB=first letter); unlisted ids stay lowercase.';
function idShapes(text:string):Trial {
  const shapes=new Map<string,{mask:string;hits:number}>();let hits=0;
  const body=text.replace(/[A-Za-z_$][A-Za-z0-9_$]*/g,w=>{const lc=w.toLowerCase();if(lc===w)return w;let bits=0n;for(let i=0;i<w.length;i++)if(w[i]>='A'&&w[i]<='Z')bits|=1n<<BigInt(i);const old=shapes.get(lc);if(old)old.hits++;else shapes.set(lc,{mask:bits.toString(16),hits:1});hits++;return lc;});
  const rows=[...shapes].sort((a,b)=>b[1].hits-a[1].hits||a[0].localeCompare(b[0])).map(([w,s])=>`${w}=${s.mask}`);
  const wire=SHAPE_KEY+'\n'+rows.length+'\n'+rows.join('\n')+'\n'+body;
  return check(text,wire,w=>{const parts=w.split('\n');const n=Number(parts[1]);if(!Number.isInteger(n)||n<0)throw Error('bad id count');const map=new Map<string,bigint>();for(const row of parts.slice(2,2+n)){const eq=row.indexOf('=');map.set(row.slice(0,eq),BigInt('0x'+row.slice(eq+1)));}return parts.slice(2+n).join('\n').replace(/[A-Za-z_$][A-Za-z0-9_$]*/g,x=>{const m=map.get(x);if(m===undefined)return x;return [...x].map((c,i)=>(m>>BigInt(i))&1n?c.toUpperCase():c).join('');});},hits);
}
// C. Inline camel-hump marker: lowercase the hump and mark it. No side table;
// useful only if BPE fragmentation exceeds one marker token.
const HUMP_KEY='In ASCII identifiers, ^ before a lowercase letter means uppercase that letter.';
function humps(text:string):Trial {
  let hits=0;const body=text.replace(/[A-Za-z_$][A-Za-z0-9_$]*/g,w=>[...w].map((c,i)=>{if(i>0&&c>='A'&&c<='Z'&&w[i-1]!=='_'){hits++;return '^'+c.toLowerCase();}return c;}).join(''));
  const wire=HUMP_KEY+'\n'+body;
  return check(text,wire,w=>w.slice(w.indexOf('\n')+1).replace(/\^([a-z])/g,(_,c)=>c.toUpperCase()),hits);
}
// D. Decimal group channel: delete a fixed thousands separator and restore by
// right-grouping. Exact only for canonical groups; a key declares the separator.
function groups(text:string,sep:string):Trial {
  const re=new RegExp('(?<![0-9])(([0-9]{1,3})(?:'+sep+'[0-9]{3})+)(?![0-9])','g');let hits=0;
  const body=text.replace(re,(_,s)=>{hits++;return s.split(sep).join('');});
  const key=`Numbers: regroup each marked digit run from the right in 3s with ${JSON.stringify(sep)}.`;
  // Marked runs use a collision-free sentinel, chosen and declared.
  const mark=['~','^','¤','§','¶','λ','µ'].find(c=>!text.includes(c));if(!mark)return no(text,'no marker');
  let n=0;const b2=text.replace(re,(_,s)=>{n++;return mark+s.split(sep).join('');});
  const wire=`${mark} before digits: group from right in 3s with ${JSON.stringify(sep)}; remove ${mark}.\n`+b2;
  return check(text,wire,w=>{const k=w.indexOf('\n');const m=w[0]!;return w.slice(k+1).replace(new RegExp(m+'([0-9]+)','g'),(_,d)=>d.replace(/\B(?=(\d{3})+(?!\d))/g,sep));},n);
}
// E. Gapped identifier template: repeated ASCII identifier skeletons with one
// varying middle segment. Header carries prefix/suffix once; body keeps a ref+value.
// This is a raw screen of scattered (not whole-line/whole-block) parameterization.
function gappedIds(text:string):Trial {
  const ids=[...text.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)].map(m=>({s:m[0],at:m.index!}));
  const groupsMap=new Map<string,{pre:string;suf:string;vals:string[];ats:number[]}>();
  for(const id of ids){if(id.s.length<10||id.s.length>80)continue;const holes=[...id.s.matchAll(/[A-Z]?[a-z]+|[0-9]+/g)].map(m=>({a:m.index!,b:m.index!+m[0].length}));for(const {a,b} of holes){if(a<2||b>id.s.length-2)continue;const pre=id.s.slice(0,a),suf=id.s.slice(b),val=id.s.slice(a,b);if(!/^[A-Za-z]+$/.test(val))continue;const k=pre+'\0'+suf;const g=groupsMap.get(k)??{pre,suf,vals:[],ats:[]};g.vals.push(val);g.ats.push(id.at);groupsMap.set(k,g);}}
  const cand=[...groupsMap.values()].filter(g=>g.vals.length>=3&&new Set(g.vals).size>=2).map(g=>({...g,score:g.vals.length*(g.pre.length+g.suf.length)-g.pre.length-g.suf.length})).sort((a,b)=>b.score-a.score).slice(0,12);
  if(!cand.length)return no(text,'no gapped identifier family');
  const mark=['~','^','¤','§','¶','λ','µ'].find(c=>!text.includes(c));if(!mark)return no(text,'no marker');
  const chosen:typeof cand=[];const used=new Set<number>();for(const g of cand){if(g.ats.some(a=>used.has(a)))continue;chosen.push(g);g.ats.forEach(a=>used.add(a));}
  const edits:Array<{at:number;len:number;rep:string}>=[];const head:string[]=[];
  chosen.forEach((g,i)=>{head.push(`${mark}${i}=${g.pre}_${g.suf}`);g.ats.forEach((at,j)=>edits.push({at,len:g.pre.length+g.vals[j]!.length+g.suf.length,rep:`${mark}${i}_${g.vals[j]}`}));});
  let body=text;for(const e of edits.sort((a,b)=>b.at-a.at))body=body.slice(0,e.at)+e.rep+body.slice(e.at+e.len);
  const wire=`${mark}i=pre_suf; ${mark}i_v replaces _ with v. Expand refs.\n`+head.join('\n')+'\n'+body;
  return check(text,wire,w=>{const ls=w.split('\n');const defs=new Map<string,[string,string]>();let i=1;for(;i<ls.length;i++){const m=/^(.)(\d+)=(.*)_([^_]*)$/.exec(ls[i]!);if(!m)break;defs.set(m[1]!+m[2]!,[m[3]!,m[4]!]);}let b=ls.slice(i).join('\n');for(const [k,[p,s]] of defs)b=b.split(k+'_').join(p+'\0'+s);return b.replace(/\0/g,'');},edits.length);
}
// F. Quoted-email prefix elision: a run of lines sharing a literal '>' prefix
// transmits the prefix once per run and strips it from member lines.
function quoteRuns(text:string):Trial {
  const lines=text.split('\n');const out:string[]=[];let hits=0;
  for(let i=0;i<lines.length;){const m=/^(>+)/.exec(lines[i]!);if(!m){out.push(lines[i++]!);continue;}const p=m[1]!;let j=i;while(j<lines.length&&lines[j]!.startsWith(p))j++;if(j-i>=3){out.push(`Q${p.length} ${j-i}`);for(let k=i;k<j;k++)out.push(lines[k]!.slice(p.length));hits+=j-i;i=j;}else out.push(lines[i++]!);}
  const wire='Qn m: next m lines each start with n > characters.\n'+out.join('\n');
  return check(text,wire,w=>{const ls=w.slice(w.indexOf('\n')+1).split('\n');const r:string[]=[];for(let i=0;i<ls.length;){const m=/^Q(\d+) (\d+)$/.exec(ls[i]!);if(!m){r.push(ls[i++]!);continue;}const n=+m[1]!,c=+m[2]!;i++;for(let k=0;k<c;k++)r.push('>'.repeat(n)+ls[i++]!);}return r.join('\n');},hits);
}
// G. Markdown link/reference split: inline links with repeated URL stems become
// label + suffix under a per-document stem table. Exact, no public canon.
function linkStems(text:string):Trial {
  const links=[...text.matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g)];if(links.length<3)return no(text,'few links');
  const by=new Map<string,typeof links>();for(const m of links){const u=m[2]!;const at=u.lastIndexOf('/');if(at<8)continue;const p=u.slice(0,at+1);const g=by.get(p)??[];g.push(m);by.set(p,g);}
  const fam=[...by].filter(([,g])=>g.length>=3).sort((a,b)=>b[1].length-a[1].length)[0];if(!fam)return no(text,'no stem family');
  const [stem,ms]=fam;const mark=['~','^','¤','§','¶','λ','µ'].find(c=>!text.includes(c));if(!mark)return no(text,'no marker');
  let body=text;for(const m of [...ms].reverse())body=body.slice(0,m.index!)+`[${m[1]}](${mark}${m[2]!.slice(stem.length)})`+body.slice(m.index!+m[0].length);
  const wire=`${mark} in link URLs = ${stem}\n`+body;
  return check(text,wire,w=>{const nl=w.indexOf('\n');const s=w.slice(w.indexOf('= ')+2,nl);return w.slice(nl+1).split(w[0]!).join(s);},ms.length);
}
const rows:any[]=[];
for(const p of lanes){const text=fs.readFileSync(p,'utf8');const raw=T(text);
  const safe=(fn:()=>Trial):Trial=>{try{return fn();}catch(e){return no(text,'inverse threw: '+(e instanceof Error?e.message:String(e)));}};
  const trials:Record<string,Trial>={caseMask:safe(()=>caseMask(text)),idShapes:safe(()=>idShapes(text)),humps:safe(()=>humps(text)),commaGroups:safe(()=>groups(text,',')),quoteRuns:safe(()=>quoteRuns(text)),gappedIds:safe(()=>gappedIds(text)),linkStems:safe(()=>linkStems(text))};
  const row:any={path:p,raw};for(const [k,v] of Object.entries(trials)){row[k]=v.exact?T(v.wire):null;row[k+'Exact']=v.exact;row[k+'Hits']=v.hits;row[k+'Note']=v.note??null;}
  rows.push(row);console.log(p.split('/').pop()!.padEnd(22)+' raw '+String(raw).padStart(5)+' '+Object.keys(trials).map(k=>k+' '+String(row[k]??'-').padStart(5)+(row[k+'Exact']?'':'!')).join(' '));
}
const keys=['caseMask','idShapes','humps','commaGroups','quoteRuns','gappedIds','linkStems'];
const totals:any={raw:rows.reduce((n,r)=>n+r.raw,0)};for(const k of keys)totals[k]=rows.reduce((n,r)=>n+(r[k]??r.raw),0);
fs.writeFileSync(out+'.json',JSON.stringify({schema:'kompkernel-x117-raw-screen-v1',note:'raw complete-key prices only; no parent/frontier gate; exact=false is refusal, not a corruption',totals,rows},null,2)+'\n');
console.log('TOTALS',JSON.stringify(totals));
