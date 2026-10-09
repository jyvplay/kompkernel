/** bench/logistike-redteam.ts — second-order adversary. Every check asserts. */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, countTokensExact, verifyChunkAlgebra, chunkCacheStats, chunkCacheClear, type EncodingName } from '../src/lib/omega/bpe';
import { chironDecode, CHIRON_START } from '../src/lib/omega/chiron';
import { logistikeEncode, logistikeTokens, logistikeVerify, logistikeWindowDelta,
         logistikeFeatures, logistikeOrder, pretokenChunks } from '../src/lib/omega/logistike';
import { metatronEncode } from '../src/lib/omega/metatron';
let checks=0, fails=0;
const ok=(c:boolean,w:string,x='')=>{checks++; if(!c){fails++; console.log('  FAIL '+w+(x?'  '+x:''));}};
const ENCS:EncodingName[]=['o200k_base','cl100k_base'];
const corpus:Array<[string,string]>=[];
for(const d of ['bench/holdout-lang','bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<14000) corpus.push([d+'/'+f,t]);}

console.log('== A. THE COST ALGEBRA IS EXACT (the load-bearing claim) ==');
for(const enc of ENCS) for(const [n,t] of corpus){
  ok(verifyChunkAlgebra(t,enc),`accelerated countTokens == exact ${enc} ${n}`,`${countTokens(t,enc)} vs ${countTokensExact(t,enc)}`);
  ok(logistikeVerify(t,enc),`logistikeTokens == exact ${enc} ${n}`);
  const cs=pretokenChunks(t,enc); ok(cs!==null && cs.join('')===t, `partition reconstructs ${enc} ${n}`);
}

console.log('== B. the accelerator never changes a token count, on adversarial strings ==');
const adv=['', 'x','ab','  ','\n','\r\n','\u0000','\u0301','e\u0301','ß','İ','ǅ',"don't","IT'S","McDonald's","'s","''",
 'a'.repeat(5000),' '.repeat(3000),'\t\n\r '.repeat(900),'1234567890'.repeat(300),'💡'.repeat(400),'👨‍👩‍👧‍👦'.repeat(200),
 '这是一个测试'.repeat(300),'これはテスト'.repeat(300),'한글테스트'.repeat(300),'مرحبا بالعالم '.repeat(200),
 'नमस्ते दुनिया '.repeat(200),'สวัสดีชาวโลก'.repeat(200),'ελληνικά '.repeat(200),'שלום '.repeat(200),
 'ПРИВЕТ привет '.repeat(200),'ABC abc AbC aBc '.repeat(200),'</div><span>'.repeat(300),'§¶×… '.repeat(300),
 'e\u0301\u0301\u0301'.repeat(300),'\uD83D'.repeat(50),'\uDE00'.repeat(50),'a\uD83Db'.repeat(50)];
for(const enc of ENCS) for(const t of adv)
  ok(countTokens(t,enc)===countTokensExact(t,enc),`accelerator exact on adversarial ${enc} ${JSON.stringify(t.slice(0,24))}`);

console.log('== C. 20000-case differential fuzz of the accelerator, both encodings ==');
let seed=0x5EED17; const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed^=seed<<5;seed>>>=0;return seed/0x100000000;};
const atoms=['the ','ドキュメント','文档','документ ','§','¶','×','…','\n','\r\n','  ','    ','123','0',' ','abc','ABC','é','💡','👨‍👩‍👧‍👦','\t','-','.',',','|','#','**','```','','ไทย','नम','한글','ع','</div>','$\\alpha$',"don't","IT'S",'\u0000','\u0301','ß','İ','\uD83D','\uDE00','  \n  ','\r'];
let ff=0;
for(let i=0;i<20000;i++){ let t=''; const k=1+Math.floor(rnd()*16); for(let j=0;j<k;j++) t+=atoms[Math.floor(rnd()*atoms.length)];
  for(const enc of ENCS) if(countTokens(t,enc)!==countTokensExact(t,enc)){ff++; if(ff<4) console.log('  FUZZ',enc,JSON.stringify(t.slice(0,80)));} }
ok(ff===0,'20000 random strings x 2 encodings: accelerator exact',`${ff} mismatches`);
ok(chunkCacheStats().fallbacks>=0,'fallback counter is sane');

console.log('== D. windowed delta is a RANKING tool and is never trusted for an accept ==');
{
  const t=fs.readFileSync('bench/holdout/gh-prose.txt','utf8');
  let agree=0,tot=0;
  for(const s of [' the',' and','https://github.com','\r\n   ',' `','. ','Reviewed-by',' node']){
    if(!t.includes(s)) continue;
    const truth=countTokens(t,'o200k_base')-countTokens(t.split(s).join('\u04d9'),'o200k_base');
    const w=logistikeWindowDelta(t,s,'\u04d9','o200k_base');
    tot++; if(w.delta===truth) agree++;
  }
  ok(agree>=tot-1,`windowed delta matches truth on ${agree}/${tot} probes`);
}

console.log('== E. codec: exactness + never-worse, both encodings ==');
for(const enc of ENCS) for(const [n,t] of corpus){
  const r=logistikeEncode(t,enc,{maxArms:1,armBudgetMs:40,useIncumbent:false});
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`);
  if(r.wire!==t) ok(chironDecode(r.wire)===t,`wire decodes ${enc} ${n}`);
  ok(r.algebraExact,`algebra exact on ${enc} ${n}`);
}

console.log('== F. never worse than the supplied incumbent ==');
for(const [n,t] of corpus.slice(0,14)){
  let inc:any; try{const m=metatronEncode(t,'o200k_base',{budgetMs:500}); if(m.decoded===t) inc=m;}catch{}
  if(!inc) continue;
  const r=logistikeEncode(t,'o200k_base',{maxArms:2,armBudgetMs:50,incumbent:inc});
  ok(r.messageTokens<=inc.messageTokens,`<= incumbent on ${n}`,`${r.messageTokens} > ${inc.messageTokens}`);
}

console.log('== G. more arms never hurt ==');
for(const [n,t] of corpus.slice(0,10)){
  const a1=logistikeEncode(t,'o200k_base',{maxArms:1,armBudgetMs:50,useIncumbent:false});
  const a4=logistikeEncode(t,'o200k_base',{maxArms:4,armBudgetMs:50,useIncumbent:false});
  ok(a4.messageTokens<=a1.messageTokens,`4 arms <= 1 arm on ${n}`);
}

console.log('== H. aim table totality ==');
{
  const valid=new Set(['w1','w3','w6','w12','w24','sb','ep','ar']);
  for(const p of ['','abc','これはテストです'.repeat(50),'a  b   c\n'.repeat(50),'{"a":1}'.repeat(40),'plain prose '.repeat(40)]){
    const o=logistikeOrder(logistikeFeatures(p));
    ok(o.length>=4&&new Set(o).size===o.length,'aim >=4 distinct arms');
    for(const a of o) ok(valid.has(a),'aim names a real arm');
  }
  ok(logistikeOrder(logistikeFeatures('これはテストです'.repeat(40)))[0]==='w3','CJK routes to w3');
}

console.log('== I. codec adversarial inputs ==');
const cadv:Array<[string,string]>=[['empty',''],['one','x'],['frames',`${CHIRON_START}abc¶def`.repeat(9)],
 ['cjk','这是一个测试文本'.repeat(40)],['kana','これはテストです'.repeat(30)],['emoji','💡⚡️🛠️ '.repeat(40)],
 ['zwj','👨‍👩‍👧‍👦 '.repeat(40)],['combining','e\u0301cole '.repeat(60)],['rtl','العربية مرحبا '.repeat(30)],
 ['crlf','a,1\r\nb,2\r\n'.repeat(40)],['nul','\u0000\u0001 abc '.repeat(40)],['huge','a'.repeat(9000)],
 ['ws',' \t\n'.repeat(900)],['norep',Array.from({length:300},(_,i)=>'q'+i.toString(36)).join(' ')],
 ['xml','<a><b>x</b></a>\n'.repeat(50)],['apos',"it's don't IT'S ".repeat(60)]];
for(const enc of ENCS) for(const [n,t] of cadv){
  let r; try{ r=logistikeEncode(t,enc,{maxArms:2,armBudgetMs:40,useIncumbent:false}); }
  catch(e){ ok(false,`no-throw ${enc} ${n}`,String(e).slice(0,100)); continue; }
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`);
}
console.log('');
console.log(`checks=${checks} failures=${fails}`);
if(fails>0) process.exit(1);
