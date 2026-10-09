/**
 * bench/syntomia-redteam.ts — second-order adversary for SYNTOMIA.
 * Every check is an assertion. Nothing is "probably fine".
 */
import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { chironDecode, chironOpsUsed, CHIRON_START, CHIRON_SEP } from '../src/lib/omega/chiron';
import {
  syntomiaEncode, syntomiaContract, syntomiaRulesClause, syntomiaRewriteContract,
  syntomiaSearch, genericWordingIsSound, letteriseGlyphs, tapeIsNested, maximalRepeats,
} from '../src/lib/omega/syntomia';
import { metatronEncode } from '../src/lib/omega/metatron';
let checks=0, fails=0;
const ok=(c:boolean,w:string,x='')=>{checks++; if(!c){fails++; console.log('  FAIL '+w+(x?'  '+x:''));}};
const ENCS:EncodingName[]=['o200k_base','cl100k_base'];

const corpus:Array<[string,string]>=[];
for(const d of ['bench/holdout-work','bench/holdout','bench/holdout-tbl','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<40000) corpus.push([d+'/'+f,t]);}

console.log('== A. exactness + never-worse, both encodings ==');
for(const enc of ENCS) for(const [n,t] of corpus){
  const r=syntomiaEncode(t,enc,{budgetMs:400});
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`,`${r.messageTokens} > ${countTokens(t,enc)}`);
  // SYNTOMIA's own arms always emit CHIRON wires; a winning incumbent arm may
  // not (METATRON's composed arms have their own decode path, already verified).
  if(r.wire!==t && r.winner!=='metatron') ok(chironDecode(r.wire)===t,`wire is a valid CHIRON wire ${enc} ${n}`);
}

console.log('== B. the contract is never longer than the incumbent\'s for the same wire ==');
for(const [n,t] of corpus.slice(0,10)){
  let m:any=null; try{m=metatronEncode(t,'o200k_base',{budgetMs:400});}catch{}
  if(!m||m.decoded!==t||!m.wire.startsWith(CHIRON_START)) continue;
  const inc=m.messageTokens-countTokens(m.wire,'o200k_base');
  const mine=countTokens(syntomiaContract(m.wire,t),'o200k_base');
  ok(mine<=inc,`contract not longer on ${n}`,`${mine} > ${inc}`);
}

console.log('== C. adversarial inputs ==');
const adv:Array<[string,string]>=[
  ['empty',''],['one','x'],['section-only',CHIRON_START],['pilcrow-only',CHIRON_SEP],
  ['both-frames',`${CHIRON_START}abc${CHIRON_SEP}def`],
  ['frames-in-text',`a ${CHIRON_START} b ${CHIRON_SEP} c ${CHIRON_START} d`.repeat(8)],
  ['cyrillic-source','привет мир привет мир привет мир привет мир привет мир'],
  ['polyglot-source','ελληνικά עברית हिन्दी ქართული ไทย ελληνικά עברית हिन्दी'],
  ['cjk-source','这是一个测试这是一个测试这是一个测试这是一个测试'],
  ['emoji',('💡 start ⚡️ fast 🛠️ rich 📦 build\n').repeat(12)],
  ['astral-zwj',('👨‍👩‍👧‍👦 family 🧬 dna\n').repeat(12)],
  ['combining',('e\u0301cole e\u0301cole e\u0301cole\n').repeat(12)],
  ['rtl',('العربية مرحبا العربية مرحبا\n').repeat(10)],
  ['crlf','a,1\r\nb,2\r\nc,3\r\n'.repeat(14)],
  ['lone-cr','x\ry\rz\r'.repeat(20)],
  ['nul','\u0000\u0001 abc abc abc abc abc abc'],
  ['long-repeat','abcabcabc'.repeat(400)],
  ['one-huge-token','a'.repeat(9000)],
  ['all-whitespace',' \t\n'.repeat(500)],
  ['markdown',fs.existsSync('bench/holdout-work/llm-answer.md')?fs.readFileSync('bench/holdout-work/llm-answer.md','utf8'):'# x'],
  ['no-repeats',Array.from({length:200},(_,i)=>'q'+i.toString(36)).join(' ')],
];
for(const enc of ENCS) for(const [n,t] of adv){
  let r; try{ r=syntomiaEncode(t,enc,{budgetMs:300}); }catch(e){ ok(false,`no-throw ${enc} ${n}`,String(e).slice(0,100)); continue; }
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`);
}

console.log('== D. generic-wording soundness gate (the bug the CPython reader found) ==');
{
  const emoji='# Vite ⚡\n- 💡 Instant Server Start\n- ⚡️ Lightning Fast HMR\n'.repeat(6);
  const r=syntomiaEncode(emoji,'o200k_base',{budgetMs:400});
  if(r.wire!==emoji) ok(!r.decoderPrompt.includes('foreign letter') || genericWordingIsSound(r.wire,emoji),
    'generic wording never claimed when the source holds non-Latin characters');
  ok(genericWordingIsSound('§аthe¶аx','plain ascii')===true,'generic sound on a letter-glyph wire');
  ok(genericWordingIsSound('§аthe¶аx','emoji 💡')===false,'generic refused when the source is non-Latin');
  ok(genericWordingIsSound('§\u0948the¶\u0948x','plain ascii')===false,'generic refused when a glyph is a combining mark');
}

console.log('== E. search is surrogate-safe ==');
{
  const s='💡abc💡abc💡abc💡abc'.repeat(30);
  const reps=[...maximalRepeats(s).keys()];
  for(const r of reps){
    const c0=r.charCodeAt(0), cz=r.charCodeAt(r.length-1);
    ok(!(c0>=0xdc00&&c0<=0xdfff),'no candidate starts on a low surrogate');
    ok(!(cz>=0xd800&&cz<=0xdbff),'no candidate ends on a high surrogate');
  }
  const out=syntomiaSearch(s,'o200k_base',{budgetMs:600});
  if(out) ok(chironDecode(out.wire)===s,'surrogate-heavy search round-trips');
}

console.log('== F. randomised differential fuzz (6000 docs) ==');
let seed=0x1234567;
const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed^=seed<<5;seed>>>=0;return seed/0x100000000;};
const pick=<T,>(a:T[])=>a[Math.floor(rnd()*a.length)];
const atoms=['the ','document ','policy ','§','¶','×','…','а','ё','\n','\r\n','  ','123','0',' ','abc','ABC','é','中','💡','\t','-','.',',','|','#','**','```',''];
let ff=0;
for(let i=0;i<6000;i++){
  let t=''; const n=1+Math.floor(rnd()*30);
  for(let k=0;k<n;k++) t+=pick(atoms);
  let r; try{ r=syntomiaEncode(t,'o200k_base',{budgetMs:60,bare:true}); }catch(e){ ff++; if(ff<4) console.log('  THROW',JSON.stringify(t.slice(0,80))); continue; }
  if(r.decoded!==t){ ff++; if(ff<4) console.log('  MISMATCH',JSON.stringify(t.slice(0,80))); }
  if(r.messageTokens>countTokens(t,'o200k_base')){ ff++; if(ff<4) console.log('  WORSE',JSON.stringify(t.slice(0,80))); }
}
ok(ff===0,'fuzz 6000 random docs exact and never-worse',`${ff} failures`);

console.log('== G. contract clause properties ==');
{
  const flat=syntomiaRulesClause('',false), nest=syntomiaRulesClause('',true);
  ok(flat.includes(CHIRON_SEP)&&flat.includes('expand')&&flat.includes('print'),'flat clause states location, action, output');
  ok(nest.includes('repeatedly'),'nested clause states recursion');
  ok(!flat.includes('repeatedly'),'flat clause omits recursion (it is not needed)');
  ok(countTokens(flat,'o200k_base')<=25,'flat clause <= 25 tokens',String(countTokens(flat,'o200k_base')));
  const orig="Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result.";
  ok(syntomiaRewriteContract(orig,true)!==orig,'rewrite fires on the CHIRON clause');
  ok(countTokens(syntomiaRewriteContract(orig,true),'o200k_base')<countTokens(orig,'o200k_base'),'rewrite is shorter');
}
console.log('');
console.log(`checks=${checks} failures=${fails}`);
if(fails>0) process.exit(1);
