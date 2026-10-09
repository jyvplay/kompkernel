/** bench/akribeia-redteam.ts — second-order adversary. Every check asserts. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { chironDecode, CHIRON_START } from '../src/lib/omega/chiron';
import { akribeiaEncode, akribeiaPolish, akribeiaFeatures, akribeiaOrder,
         pretokenChunks, akribeiaEstimate, chunkModelExact, parseWire, renderWire, dropRule } from '../src/lib/omega/akribeia';
import { metatronEncode } from '../src/lib/omega/metatron';
import { sibylEncode } from '../src/lib/omega/sibyl';
let checks=0, fails=0;
const ok=(c:boolean,w:string,x='')=>{checks++; if(!c){fails++; console.log('  FAIL '+w+(x?'  '+x:''));}};
const ENCS:EncodingName[]=['o200k_base','cl100k_base'];
const corpus:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<14000) corpus.push([d+'/'+f,t]);}

console.log('== A. exactness + never-worse-than-identity, both encodings ==');
for(const enc of ENCS) for(const [n,t] of corpus){
  const r=akribeiaEncode(t,enc,{maxArms:1,armBudgetMs:40,useIncumbent:false});
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`,`${r.messageTokens} > ${countTokens(t,enc)}`);
  if(r.wire!==t) ok(chironDecode(r.wire)===t,`wire decodes via chironDecode ${enc} ${n}`);
}

console.log('== B. never worse than the supplied incumbent ==');
for(const [n,t] of corpus.slice(0,14)){
  let inc:any; try{const m=metatronEncode(t,'o200k_base',{budgetMs:500}); if(m.decoded===t) inc=m;}catch{}
  if(!inc) continue;
  const r=akribeiaEncode(t,'o200k_base',{maxArms:2,armBudgetMs:50,incumbent:inc});
  ok(r.messageTokens<=inc.messageTokens,`<= incumbent on ${n}`,`${r.messageTokens} > ${inc.messageTokens}`);
  ok(r.decoded===t,`exact with incumbent ${n}`);
}

console.log('== C. the chunk model is RANKING-ONLY: it never gates an accept ==');
{
  // the model is allowed to be wrong; assert the codec is still exact when it is
  let wrong=0;
  for(const [n,t] of corpus){ if(!chunkModelExact(t,'o200k_base')) wrong++; }
  console.log(`  (chunk model diverges on ${wrong}/${corpus.length} documents — by design, it only ranks)`);
  for(const [n,t] of corpus){
    if(chunkModelExact(t,'o200k_base')) continue;
    const r=akribeiaEncode(t,'o200k_base',{maxArms:1,armBudgetMs:40,useIncumbent:false});
    ok(r.decoded===t,`exact even where the chunk model diverges: ${n}`);
    ok(r.messageTokens<=countTokens(t,'o200k_base'),`never-worse where the chunk model diverges: ${n}`);
  }
  for(const [n,t] of corpus) ok(pretokenChunks(t).join('')===t,`chunk decomposition reconstructs ${n}`);
}

console.log('== D. polish is monotone and exact ==');
for(const [n,t] of corpus.slice(0,12)){
  let w:string|null=null;
  try{ const r=sibylEncode(t,'o200k_base',{budgetMs:60,wordGrid:[6]} as any);
    if(r.decoded===t&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===t) w=r.wire; }catch{}
  if(!w) continue;
  const p=akribeiaPolish(w,t,'o200k_base');
  if(!p) continue;
  ok(chironDecode(p.wire)===t,`polish round-trips ${n}`);
  ok(p.tokens<=countTokens(w,'o200k_base')+60,`polish does not blow up ${n}`);
  ok(p.dropped>=0,'dropped count is sane');
}

console.log('== E. tape surgery is sound (dropRule preserves meaning) ==');
for(const [n,t] of corpus.slice(0,12)){
  let w:string|null=null;
  try{ const r=sibylEncode(t,'o200k_base',{budgetMs:60,wordGrid:[6]} as any);
    if(r.decoded===t&&typeof r.wire==='string'&&r.wire.startsWith(CHIRON_START)&&chironDecode(r.wire)===t) w=r.wire; }catch{}
  if(!w) continue;
  const p=parseWire(w); if(!p||!p.rules.length) continue;
  for(let i=0;i<Math.min(p.rules.length,6);i++){
    const d=dropRule(p,i);
    ok(chironDecode(renderWire(d.rules,d.body))===t,`dropRule ${i} preserves bytes on ${n}`);
  }
}

console.log('== F. adversarial inputs ==');
const adv:Array<[string,string]>=[
  ['empty',''],['one','x'],['two','ab'],
  ['frames',`${CHIRON_START}abc¶def`.repeat(9)],
  ['frames-in-text',`a ${CHIRON_START} b ¶ c × … d `.repeat(12)],
  ['cyrillic','привет мир '.repeat(30)],['greek','ελληνικά κείμενο '.repeat(25)],
  ['hebrew','שלום עולם טקסט '.repeat(25)],['devanagari','नमस्ते दुनिया पाठ '.repeat(25)],
  ['thai','สวัสดีชาวโลกข้อความ'.repeat(25)],['cjk','这是一个测试文本'.repeat(40)],
  ['kana','これはテストのテキストです'.repeat(30)],['hangul','이것은 테스트 텍스트입니다 '.repeat(25)],
  ['arabic','مرحبا بالعالم نص '.repeat(25)],['all-scripts','abcаёαאאहก中かあ한م '.repeat(40)],
  ['emoji','💡⚡️🛠️📦🔩🔑 start '.repeat(30)],['zwj','👨‍👩‍👧‍👦 family 🧬 dna '.repeat(25)],
  ['combining','e\u0301cole e\u0301cole '.repeat(40)],['rtl-mixed','abc العربية def مرحبا '.repeat(25)],
  ['crlf','a,1\r\nb,2\r\nc,3\r\n'.repeat(30)],['lone-cr','x\ry\rz\r'.repeat(40)],
  ['nul','\u0000\u0001 abc abc abc abc '.repeat(20)],['huge-token','a'.repeat(9000)],
  ['all-ws',' \t\n'.repeat(900)],['no-repeats',Array.from({length:300},(_,i)=>'q'+i.toString(36)).join(' ')],
  ['xml-close','<a><b><c>x</c></b></a>\n'.repeat(40)],
  ['html','<div class="x"><span>y</span></div>\n'.repeat(40)],
  ['latex','$\\sum_{i=1}^{n} x_i \\leq \\alpha$ '.repeat(40)],
];
for(const enc of ENCS) for(const [n,t] of adv){
  let r; try{ r=akribeiaEncode(t,enc,{maxArms:2,armBudgetMs:40,useIncumbent:false}); }
  catch(e){ ok(false,`no-throw ${enc} ${n}`,String(e).slice(0,110)); continue; }
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`);
}

console.log('== G. aim table totality ==');
{
  const valid=new Set(['w1','w3','w6','w12','w24','sb','ep','ar']);
  for(const p of ['','abc','これはテストです'.repeat(50),'a  b   c\n'.repeat(50),'{"a":1,"b":[2,3]}'.repeat(40),'plain english prose '.repeat(40)]){
    const o=akribeiaOrder(akribeiaFeatures(p));
    ok(o.length>=4&&new Set(o).size===o.length,'aim is >=4 distinct arms');
    for(const a of o) ok(valid.has(a),'aim names a real arm: '+a);
  }
  ok(akribeiaOrder(akribeiaFeatures('これはテストです'.repeat(40)))[0]==='w3','CJK routes to w3');
  ok(akribeiaOrder(akribeiaFeatures(Array.from({length:40},(_,i)=>`a${i}    b${i}     c${i}`).join('\n')))[0]==='w6','columns route to w6');
}

console.log('== H. more arms never hurt ==');
for(const [n,t] of corpus.slice(0,10)){
  const a1=akribeiaEncode(t,'o200k_base',{maxArms:1,armBudgetMs:50,useIncumbent:false});
  const a3=akribeiaEncode(t,'o200k_base',{maxArms:3,armBudgetMs:50,useIncumbent:false});
  ok(a3.messageTokens<=a1.messageTokens,`3 arms <= 1 arm on ${n}`,`${a3.messageTokens} > ${a1.messageTokens}`);
}

console.log('== I. randomised differential fuzz (4000 docs) ==');
let seed=0xBEEF77;
const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed^=seed<<5;seed>>>=0;return seed/0x100000000;};
const pick=<T,>(a:T[])=>a[Math.floor(rnd()*a.length)];
const atoms=['the ','документ ','ドキュメント','文档','dokument ','§','¶','×','…','а','ё','\n','\r\n','  ','    ','123','0',' ','abc','ABC','é','💡','\t','-','.',',','|','#','**','```','','ไทย','नम','한글','ع','</div>','<span>','$\\alpha$'];
let ff=0;
for(let i=0;i<4000;i++){
  let t=''; const n=1+Math.floor(rnd()*26);
  for(let k=0;k<n;k++) t+=pick(atoms);
  let r; try{ r=akribeiaEncode(t,'o200k_base',{maxArms:1,armBudgetMs:10,useIncumbent:false}); }
  catch(e){ ff++; if(ff<4) console.log('  THROW',JSON.stringify(t.slice(0,80))); continue; }
  if(r.decoded!==t){ ff++; if(ff<4) console.log('  MISMATCH',JSON.stringify(t.slice(0,80))); }
  if(r.messageTokens>countTokens(t,'o200k_base')){ ff++; if(ff<4) console.log('  WORSE',JSON.stringify(t.slice(0,80))); }
}
ok(ff===0,'fuzz 4000 random multilingual/markup docs exact and never-worse',`${ff} failures`);
console.log('');
console.log(`checks=${checks} failures=${fails}`);
if(fails>0) process.exit(1);
