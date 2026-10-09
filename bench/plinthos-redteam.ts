import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { plinthosEncode, plinthosEncodeText, plinthosDecodeText, scanBlocks, PL_SEPS, PL_OPEN, PL_CLOSE } from '../src/lib/omega/plinthos';
import { metatronEncode } from '../src/lib/omega/metatron';
let checks=0, fails=0;
const ok=(c:boolean,w:string,x='')=>{checks++; if(!c){fails++; console.log('  FAIL '+w+(x?'  '+x:''));}};
const ENCS:EncodingName[]=['o200k_base','cl100k_base'];
const corpus:Array<[string,string]>=[];
for(const d of ['bench/holdout-tab','bench/holdout-tbl','bench/holdout-work','bench/holdout','bench/holdout-mk'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<9000) corpus.push([d+'/'+f,t]);}
console.log('== A. the transform is its own witness ==');
for(const enc of ENCS) for(const [n,t] of corpus){
  const r=plinthosEncodeText(t,enc); if(!r) continue;
  ok(plinthosDecodeText(r.out)===t,`inverse ${enc} ${n}`);
  ok(r.blocks>=1&&r.rows>=4,`block stats sane ${n}`);
}
console.log('== B. MULTI-BLOCK: documents with several tables get all of them ==');
{
  const t='head\n'+Array.from({length:6},(_,i)=>`${i},${i*2},${i*3}`).join('\n')+'\nmid\n'
         +Array.from({length:7},(_,i)=>`a${i}|b${i}|c${i}|d${i}`).join('\n')+'\ntail\n';
  const r=plinthosEncodeText(t,'o200k_base');
  ok(!!r,'fires on a two-table document');
  if(r){ ok(r.blocks===2,'both blocks transposed',String(r.blocks));
         ok(plinthosDecodeText(r.out)===t,'two-block inverse exact');
         ok((r.out.match(new RegExp(PL_OPEN,'g'))??[]).length===2,'two open markers'); }
  // three blocks
  const t3=t+'\n'+Array.from({length:5},(_,i)=>`${i};${i};${i}`).join('\n')+'\n';
  const r3=plinthosEncodeText(t3,'o200k_base');
  if(r3){ ok(r3.blocks>=2,'three-table doc gets >=2 blocks',String(r3.blocks));
          ok(plinthosDecodeText(r3.out)===t3,'three-block inverse exact'); }
}
console.log('== C. codec exactness + never-worse, both encodings ==');
for(const enc of ENCS) for(const [n,t] of corpus.slice(0,12)){
  const r=plinthosEncode(t,enc,{maxConfigs:1,configBudgetMs:25,useIncumbent:false});
  ok(r.decoded===t,`exact ${enc} ${n}`);
  ok(r.messageTokens<=countTokens(t,enc),`never-worse ${enc} ${n}`);
}
console.log('== D. never worse than the supplied incumbent ==');
for(const [n,t] of corpus.slice(0,8)){
  let inc:any; try{const m=metatronEncode(t,'o200k_base',{budgetMs:300}); if(m.decoded===t) inc=m;}catch{}
  if(!inc) continue;
  const r=plinthosEncode(t,'o200k_base',{maxConfigs:1,configBudgetMs:25,incumbent:inc});
  ok(r.messageTokens<=inc.messageTokens,`<= incumbent ${n}`,`${r.messageTokens} > ${inc.messageTokens}`);
}
console.log('== E. adversarial tables ==');
const adv:Array<[string,string]>=[
  ['empty-fields','a,,c\n,,\nx,y,z\n1,2,3\n4,5,6\n'],['sep-end','a,b,\nc,d,\ne,f,\ng,h,\n'],
  ['sep-start',',a,b\n,c,d\n,e,f\n,g,h\n'],['ragged','a,b\na,b,c\na,b\na,b,c\n'],
  ['no-nl','a,b\nc,d\ne,f\ng,h\ni,j'],['crlf','a,b\r\nc,d\r\ne,f\r\ng,h\r\n'],
  ['markers',`${PL_OPEN},\na,b\n${PL_CLOSE}\n`],['close-only',`${PL_CLOSE}\na,b\nc,d\ne,f\ng,h\n`],
  ['one-col','a\nb\nc\nd\ne\n'],['blanks','a,b\n\nc,d\n\ne,f\n\ng,h\n'],
  ['tabs','a\tb\tc\nd\te\tf\ng\th\ti\nj\tk\tl\n'],['pipes','|a|b|\n|c|d|\n|e|f|\n|g|h|\n'],
  ['unicode','é,中,🙂\nß,한,💡\nñ,ไ,⚡\nø,ع,🛠\n'],['zwj','👨‍👩‍👧‍👦,a\n👨‍👩‍👧‍👦,b\n👨‍👩‍👧‍👦,c\n👨‍👩‍👧‍👦,d\n'],
  ['nul','\u0000,a\n\u0001,b\n\u0002,c\n\u0003,d\n'],['bigcell','x'.repeat(3000)+',a\ny,b\nz,c\nw,d\n'],
  ['manycols',Array.from({length:6},(_,r)=>Array.from({length:40},(_,c)=>`${r}${c}`).join(',')).join('\n')+'\n'],
  ['onlyseps',',,,\n,,,\n,,,\n,,,\n'],['oneline','a,b,c,d'],['prose','just words here. '.repeat(50)],
];
for(const [n,t] of adv){
  const r=plinthosEncodeText(t,'o200k_base');
  if(r) ok(plinthosDecodeText(r.out)===t,`inverse ${n}`,JSON.stringify(t.slice(0,36)));
  for(const enc of ENCS){
    let k; try{ k=plinthosEncode(t,enc,{maxConfigs:1,configBudgetMs:20,useIncumbent:false}); }
    catch(e){ ok(false,`no-throw ${enc} ${n}`,String(e).slice(0,80)); continue; }
    ok(k.decoded===t,`codec exact ${enc} ${n}`);
    ok(k.messageTokens<=countTokens(t,enc),`codec never-worse ${enc} ${n}`);
  }
}
console.log('== F. scanBlocks soundness ==');
for(const [n,t] of corpus.slice(0,12)){
  const lines=t.replace(/\n$/,'').split('\n');
  for(const sep of PL_SEPS) for(const b of scanBlocks(lines,sep)){
    ok(b.end-b.start>=4&&b.cols>=2,`block shape ${n}`);
    for(let i=b.start;i<b.end;i++) ok(lines[i].split(sep).length===b.cols,`consistent line ${i} ${n}`);
  }
}
console.log('== G. blocks are disjoint and ordered ==');
for(const [n,t] of corpus){
  const r=plinthosEncodeText(t,'o200k_base'); if(!r||r.blocks<2) continue;
  const opens=(r.out.match(new RegExp(PL_OPEN,'g'))??[]).length;
  const closes=(r.out.match(new RegExp(PL_CLOSE,'g'))??[]).length;
  ok(opens===closes&&opens===r.blocks,`balanced markers ${n}`,`${opens}/${closes}/${r.blocks}`);
}
console.log('== H. fuzz (3000 random tables, ragged rows, separators inside cells) ==');
let seed=0xDEC0DE;
const rnd=()=>{seed^=seed<<13;seed>>>=0;seed^=seed>>17;seed^=seed<<5;seed>>>=0;return seed/0x100000000;};
const cell=['a','b','','1','é','中','💡','x y','  ','\t','|',',',';','\u0000'];
let ff=0;
for(let i=0;i<900;i++){
  const rows=1+Math.floor(rnd()*10), cols=1+Math.floor(rnd()*6);
  const sep=PL_SEPS[Math.floor(rnd()*PL_SEPS.length)];
  let t='';
  for(let r=0;r<rows;r++){const f:string[]=[]; const w=rnd()<0.15?Math.max(1,cols+Math.floor(rnd()*3)-1):cols;
    for(let c=0;c<w;c++) f.push(cell[Math.floor(rnd()*cell.length)]);
    t+=f.join(sep)+(r<rows-1||rnd()<0.5?'\n':'');}
  const r=plinthosEncodeText(t,'o200k_base');
  if(r&&plinthosDecodeText(r.out)!==t){ff++; if(ff<4) console.log('  FUZZ',JSON.stringify(t.slice(0,60)));}
  let k; try{k=plinthosEncode(t,'o200k_base',{maxConfigs:1,configBudgetMs:4,useIncumbent:false});}
  catch(e){ff++; if(ff<4) console.log('  THROW',JSON.stringify(t.slice(0,60))); continue;}
  if(k.decoded!==t){ff++; if(ff<4) console.log('  MISMATCH',JSON.stringify(t.slice(0,60)));}
  if(k.messageTokens>countTokens(t,'o200k_base')){ff++;}
}
ok(ff===0,'fuzz 900 random tables exact and never-worse',`${ff} failures`);
console.log('');
console.log(`checks=${checks} failures=${fails}`);
if(fails>0) process.exit(1);
