/** bench/eustochia-redteam.ts — second-order adversary. Every check asserts. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { chironDecode, CHIRON_START } from '../src/lib/omega/chiron';
import { eustochiaEncode, eustochiaFeatures, eustochiaOrder, EUSTOCHIA_ARMS } from '../src/lib/omega/eustochia';
import { metatronEncode } from '../src/lib/omega/metatron';
let checks=0, fails=0;
const ok=(c:boolean,w:string,x='')=>{checks++; if(!c){fails++; console.log('  FAIL '+w+(x?'  '+x:''));}};
const ENCS:EncodingName[]=['o200k_base','cl100k_base'];
const corpus:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<20000) corpus.push([d+'/'+f,t]);}

console.log('== A. exactness + never-worse-than-identity, both encodings ==');
for(const enc of ENCS) for(const [n,t] of corpus){
  const r=eustochiaEncode(t,enc,{maxArms:1,armBudgetMs:40,useIncumbent:false});
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`,`${r.messageTokens} > ${countTokens(t,enc)}`);
  if(r.wire!==t && r.winner!=='metatron') ok(chironDecode(r.wire)===t,`wire decodes via chironDecode ${enc} ${n}`);
}

console.log('== B. never worse than the supplied incumbent (the core claim) ==');
for(const [n,t] of corpus.slice(0,14)){
  let inc:any; try{const m=metatronEncode(t,'o200k_base',{budgetMs:600}); if(m.decoded===t) inc=m;}catch{}
  if(!inc) continue;
  const r=eustochiaEncode(t,'o200k_base',{maxArms:2,armBudgetMs:60,incumbent:inc});
  ok(r.messageTokens<=inc.messageTokens,`<= incumbent on ${n}`,`${r.messageTokens} > ${inc.messageTokens}`);
  ok(r.decoded===t,`exact with incumbent ${n}`);
}

console.log('== C. adversarial inputs ==');
const adv:Array<[string,string]>=[
  ['empty',''],['one','x'],['two','ab'],
  ['frames',`${CHIRON_START}abc¶def`.repeat(9)],
  ['frames-in-text',`a ${CHIRON_START} b ¶ c × … d `.repeat(12)],
  ['cyrillic','привет мир '.repeat(30)],
  ['greek','ελληνικά κείμενο '.repeat(25)],
  ['hebrew','שלום עולם טקסט '.repeat(25)],
  ['devanagari','नमस्ते दुनिया पाठ '.repeat(25)],
  ['thai','สวัสดีชาวโลกข้อความ'.repeat(25)],
  ['cjk','这是一个测试文本'.repeat(40)],
  ['kana','これはテストのテキストです'.repeat(30)],
  ['hangul','이것은 테스트 텍스트입니다 '.repeat(25)],
  ['arabic','مرحبا بالعالم نص '.repeat(25)],
  ['all-scripts','abcаёαאאहก中かあ한م '.repeat(40)],
  ['emoji','💡⚡️🛠️📦🔩🔑 start '.repeat(30)],
  ['zwj','👨‍👩‍👧‍👦 family 🧬 dna '.repeat(25)],
  ['combining','e\u0301cole e\u0301cole '.repeat(40)],
  ['rtl-mixed','abc العربية def مرحبا '.repeat(25)],
  ['crlf','a,1\r\nb,2\r\nc,3\r\n'.repeat(30)],
  ['lone-cr','x\ry\rz\r'.repeat(40)],
  ['nul','\u0000\u0001 abc abc abc abc '.repeat(20)],
  ['huge-token','a'.repeat(9000)],
  ['all-ws',' \t\n'.repeat(900)],
  ['no-repeats',Array.from({length:300},(_,i)=>'q'+i.toString(36)).join(' ')],
  ['one-line','x'.repeat(200)+' '+'y'.repeat(200)],
  ['many-cols',Array.from({length:40},(_,i)=>`col${i}    val${i}     x${i}`).join('\n')],
];
for(const enc of ENCS) for(const [n,t] of adv){
  let r; try{ r=eustochiaEncode(t,enc,{maxArms:2,armBudgetMs:40,useIncumbent:false}); }
  catch(e){ ok(false,`no-throw ${enc} ${n}`,String(e).slice(0,110)); continue; }
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`);
}

console.log('== D. the aim table is total and well-formed ==');
{
  const names=new Set(EUSTOCHIA_ARMS.map(a=>a.name));
  const probes=['','abc','这是测试'.repeat(50),'a  b   c\n'.repeat(50),'{"a":1,"b":[2,3]}'.repeat(40),'plain english prose here '.repeat(40)];
  for(const p of probes){
    const o=eustochiaOrder(eustochiaFeatures(p));
    ok(o.length>=4,'aim returns >= 4 arms');
    for(const a of o) ok(names.has(a),'aim names a real arm: '+a);
    ok(new Set(o).size===o.length,'aim has no duplicates');
  }
  const cjk=eustochiaFeatures('これはテストです'.repeat(40));
  ok(eustochiaOrder(cjk)[0]==='sb-w3','CJK routes to sb-w3 first', eustochiaOrder(cjk)[0]);
  const cols=eustochiaFeatures(Array.from({length:40},(_,i)=>`a${i}    b${i}     c${i}`).join('\n'));
  ok(eustochiaOrder(cols)[0]==='sb-w6','fixed-width columns route to sb-w6 first', eustochiaOrder(cols)[0]);
}

console.log('== E. more arms never hurt (monotonicity of the portfolio) ==');
for(const [n,t] of corpus.slice(0,10)){
  const a1=eustochiaEncode(t,'o200k_base',{maxArms:1,armBudgetMs:50,useIncumbent:false});
  const a3=eustochiaEncode(t,'o200k_base',{maxArms:3,armBudgetMs:50,useIncumbent:false});
  ok(a3.messageTokens<=a1.messageTokens,`3 arms <= 1 arm on ${n}`,`${a3.messageTokens} > ${a1.messageTokens}`);
  ok(a3.decoded===t&&a1.decoded===t,`both exact ${n}`);
}

console.log('== F. randomised differential fuzz (4000 docs) ==');
let seed=0xC0FFEE;
const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed^=seed<<5;seed>>>=0;return seed/0x100000000;};
const pick=<T,>(a:T[])=>a[Math.floor(rnd()*a.length)];
const atoms=['the ','документ ','ドキュメント','文档','dokument ','§','¶','×','…','а','ё','\n','\r\n','  ','    ','123','0',' ','abc','ABC','é','💡','\t','-','.',',','|','#','**','```','','ไทย','नम','한글','ع'];
let ff=0;
for(let i=0;i<4000;i++){
  let t=''; const n=1+Math.floor(rnd()*26);
  for(let k=0;k<n;k++) t+=pick(atoms);
  let r; try{ r=eustochiaEncode(t,'o200k_base',{maxArms:1,armBudgetMs:12,useIncumbent:false}); }
  catch(e){ ff++; if(ff<4) console.log('  THROW',JSON.stringify(t.slice(0,80))); continue; }
  if(r.decoded!==t){ ff++; if(ff<4) console.log('  MISMATCH',JSON.stringify(t.slice(0,80))); }
  if(r.messageTokens>countTokens(t,'o200k_base')){ ff++; if(ff<4) console.log('  WORSE',JSON.stringify(t.slice(0,80))); }
}
ok(ff===0,'fuzz 4000 random multilingual docs exact and never-worse',`${ff} failures`);
console.log('');
console.log(`checks=${checks} failures=${fails}`);
if(fails>0) process.exit(1);
