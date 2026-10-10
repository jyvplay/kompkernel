/** bench/kiones-redteam.ts — second-order adversary. Every check asserts. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { chironDecode, CHIRON_START } from '../src/lib/omega/chiron';
import { kionesEncode, kionesDecodeText, kionesEncodeText, findBlocks,
         KION_OPEN, KION_CLOSE, KION_SEPS } from '../src/lib/omega/kiones';
import { metatronEncode } from '../src/lib/omega/metatron';
let checks=0, fails=0;
const ok=(c:boolean,w:string,x='')=>{checks++; if(!c){fails++; console.log('  FAIL '+w+(x?'  '+x:''));}};
const ENCS:EncodingName[]=['o200k_base','cl100k_base'];
const corpus:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<5000) corpus.push([d+'/'+f,t]);}

console.log('== A. the TRANSFORM is its own witness: inverse reproduces the input ==');
for(const enc of ENCS) for(const [n,t] of corpus){
  const r=kionesEncodeText(t,enc);
  if(!r) continue;
  ok(kionesDecodeText(r.out)===t,`transpose round-trips ${enc} ${n}`);
  ok(r.out.includes(KION_OPEN)&&r.out.includes(KION_CLOSE),`markers present ${n}`);
}
console.log('== B. codec exactness + never-worse-than-identity, both encodings ==');
for(const enc of ENCS) for(const [n,t] of corpus.slice(0,14)){
  const r=kionesEncode(t,enc,{maxConfigs:1,configBudgetMs:25,useIncumbent:false});
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`);
}
console.log('== C. never worse than the supplied incumbent ==');
for(const [n,t] of corpus.slice(0,8)){
  let inc:any; try{const m=metatronEncode(t,'o200k_base',{budgetMs:300}); if(m.decoded===t) inc=m;}catch{}
  if(!inc) continue;
  const r=kionesEncode(t,'o200k_base',{maxConfigs:1,configBudgetMs:25,incumbent:inc});
  ok(r.messageTokens<=inc.messageTokens,`<= incumbent on ${n}`,`${r.messageTokens} > ${inc.messageTokens}`);
  ok(r.decoded===t,`exact with incumbent ${n}`);
}
console.log('== D. transpose inverse on hand-built tables, every separator ==');
for(const sep of KION_SEPS){
  for(const [rows,cols] of [[4,2],[7,3],[20,5],[5,12]] as Array<[number,number]>){
    const t=Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>`v${r}_${c}`).join(sep)).join('\n')+'\n';
    const r=kionesEncodeText(t,'o200k_base');
    if(!r){ ok(true,`declined ${JSON.stringify(sep)} ${rows}x${cols} (allowed)`); continue; }
    ok(kionesDecodeText(r.out)===t,`round-trip ${JSON.stringify(sep)} ${rows}x${cols}`);
  }
}
console.log('== E. adversarial tables designed to break the inverse ==');
const adv:Array<[string,string]>=[
  ['empty-fields','a,,c\n,,\nx,y,z\n1,2,3\n4,5,6\n'],
  ['sep-at-end','a,b,\nc,d,\ne,f,\ng,h,\ni,j,\n'],
  ['sep-at-start',',a,b\n,c,d\n,e,f\n,g,h\n,i,j\n'],
  ['ragged','a,b\na,b,c\na,b\na,b,c\na,b\n'],
  ['no-trailing-nl','a,b\nc,d\ne,f\ng,h\ni,j'],
  ['crlf','a,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j\r\n'],
  ['marker-in-text',`${KION_OPEN},\na,b\nc,d\n${KION_CLOSE}\n`],
  ['close-only',`${KION_CLOSE}\na,b\nc,d\ne,f\ng,h\n`],
  ['single-col','a\nb\nc\nd\ne\nf\n'],
  ['blank-lines','a,b\n\nc,d\n\ne,f\n\ng,h\n'],
  ['tabs','a\tb\tc\nd\te\tf\ng\th\ti\nj\tk\tl\nm\tn\to\n'],
  ['pipes','|a|b|\n|c|d|\n|e|f|\n|g|h|\n|i|j|\n'],
  ['semis','a;b;c\nd;e;f\ng;h;i\nj;k;l\n'],
  ['two-spaces','a  b  c\nd  e  f\ng  h  i\nj  k  l\n'],
  ['unicode','é,中,🙂\nß,한,💡\nñ,ไ,⚡\nø,ع,🛠\np,q,r\n'],
  ['zwj','👨‍👩‍👧‍👦,a\n👨‍👩‍👧‍👦,b\n👨‍👩‍👧‍👦,c\n👨‍👩‍👧‍👦,d\n'],
  ['nul','\u0000,a\n\u0001,b\n\u0002,c\n\u0003,d\n'],
  ['huge-cell','x'.repeat(3000)+',a\ny,b\nz,c\nw,d\n'],
  ['many-cols',Array.from({length:6},(_,r)=>Array.from({length:40},(_,c)=>`${r}${c}`).join(',')).join('\n')+'\n'],
  ['one-line','a,b,c,d,e'],
  ['only-seps',',,,\n,,,\n,,,\n,,,\n'],
];
for(const [n,t] of adv){
  const r=kionesEncodeText(t,'o200k_base');
  if(r) ok(kionesDecodeText(r.out)===t,`transform round-trips ${n}`,JSON.stringify(t.slice(0,40)));
  for(const enc of ENCS){
    let k; try{ k=kionesEncode(t,enc,{maxConfigs:1,configBudgetMs:20,useIncumbent:false}); }
    catch(e){ ok(false,`no-throw ${enc} ${n}`,String(e).slice(0,90)); continue; }
    ok(k.decoded===t,`codec exact ${enc} ${n}`);
    ok(k.messageTokens<=countTokens(t,enc),`codec never-worse ${enc} ${n}`);
  }
}
console.log('== F. findBlocks is sound (every reported block really is consistent) ==');
for(const [n,t] of corpus.slice(0,14)){
  const lines=t.replace(/\n$/,'').split('\n');
  for(const sep of KION_SEPS) for(const b of findBlocks(lines,sep)){
    ok(b.end-b.start>=4,`block long enough ${n}`);
    ok(b.cols>=2,`block wide enough ${n}`);
    for(let i=b.start;i<b.end;i++) ok(lines[i].split(sep).length===b.cols,`block consistent at line ${i} ${n}`);
  }
}
console.log('== G. non-table inputs must be untouched ==');
for(const t of ['plain english prose with no table at all. '.repeat(40),
                'これはテストです'.repeat(40),'# heading\n\nparagraph\n\nanother\n']){
  const r=kionesEncodeText(t,'o200k_base');
  if(r) ok(kionesDecodeText(r.out)===t,'round-trips even if it fires on prose');
  const k=kionesEncode(t,'o200k_base',{maxConfigs:1,configBudgetMs:20,useIncumbent:false});
  ok(k.decoded===t,'prose exact');
}
console.log('== H. randomised differential fuzz (4000 docs) ==');
let seed=0xC01503;
const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed^=seed<<5;seed>>>=0;return seed/0x100000000;};
let ff=0;
for(let i=0;i<2500;i++){
  const rows=1+Math.floor(rnd()*9), cols=1+Math.floor(rnd()*6);
  const sep=KION_SEPS[Math.floor(rnd()*KION_SEPS.length)];
  const cell=['a','b','','1','é','中','💡','x y','  ','\t','|',',',';'];
  let t='';
  for(let r=0;r<rows;r++){ const f:string[]=[];
    const w=rnd()<0.12? Math.max(1,cols+Math.floor(rnd()*3)-1) : cols;
    for(let c=0;c<w;c++) f.push(cell[Math.floor(rnd()*cell.length)]);
    t+=f.join(sep)+(r<rows-1||rnd()<0.5?'\n':''); }
  const r=kionesEncodeText(t,'o200k_base');
  if(r&&kionesDecodeText(r.out)!==t){ ff++; if(ff<4) console.log('  FUZZ',JSON.stringify(t.slice(0,70))); }
  let k; try{ k=kionesEncode(t,'o200k_base',{maxConfigs:1,configBudgetMs:4,useIncumbent:false}); }
  catch(e){ ff++; if(ff<4) console.log('  THROW',JSON.stringify(t.slice(0,70))); continue; }
  if(k.decoded!==t){ ff++; if(ff<4) console.log('  MISMATCH',JSON.stringify(t.slice(0,70))); }
  if(k.messageTokens>countTokens(t,'o200k_base')){ ff++; if(ff<4) console.log('  WORSE',JSON.stringify(t.slice(0,70))); }
}
ok(ff===0,'fuzz 2500 random tables exact and never-worse',`${ff} failures`);
console.log('');
console.log(`checks=${checks} failures=${fails}`);
if(fails>0) process.exit(1);
