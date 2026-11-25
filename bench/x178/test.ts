import fs from 'node:fs';import assert from 'node:assert/strict';import {encode,decode} from 'gpt-tokenizer/encoding/o200k_base';
import {pinakasInsert,pinakasRemove,pinakasPlans,pinakasFold,pinakasUndo,pinakasRead} from '../../src/lib/omega/pinakas';
let checks=0;const pairs:any[]=[];
for(let n=1;n<=8;n++)for(let code=0;code<3**n;code++){let c=code;const fields=Array.from({length:n},()=>{const x=['','a','b'][c%3];c=Math.floor(c/3);return x;});const b=pinakasInsert(fields);assert.deepEqual(pinakasRemove([b.trace,b.rows]),fields);pairs.push({fields,...b});checks++;}
let seed=178;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;}
for(let i=0;i<2000;i++){const fields=Array.from({length:1+rand()%128},()=>String.fromCharCode(rand()%128));const b=pinakasInsert(fields);assert.deepEqual(pinakasRemove([b.trace,b.rows]),fields);checks++;}
for(const source of ['', ' ', '\n','\r\n','\u0000\t \\"\n',...Array.from({length:6},(_,i)=>' a b '.repeat([6,7,8,31,32,33][i]))])for(const n of [32,128])for(const mode of ['space','LF'] as const){assert.equal(pinakasUndo(pinakasFold(source,n,mode),n,mode),source);checks++;}
for(const bad of [null,[],[[],[]],[[0],[['b','a']]],[[1],[['a']]],[[0,1],[['a'],['a']]],[[0,0],[['a'],['b']]],[[0],[['\u0100']]]]){assert.throws(()=>pinakasRemove(bad));checks++;}
assert.throws(()=>pinakasFold('🙂',32,'space'));assert.throws(()=>pinakasFold('x'.repeat(50001),32,'space'));checks+=2;
// Patch-targeted attack: 10/11-row and 100/101-row decimal-width transitions.
for(const size of [1,9,10,11,99,100,101,128]){const source=Array.from({length:size},(_,i)=>String(size-i).padStart(3,'0')).join(' ');assert.equal(pinakasUndo(pinakasFold(source,128,'space'),128,'space'),source);checks++;}
for(const bad of ['["",[["a"]]]','["00",[["a"]]]','["x",[["a"]]]','["1",[["a"]]]','["0",[["a b"]]]']){assert.throws(()=>pinakasUndo(bad,32,'space'));checks++;}
// Maximum admitted byte length: no token-price benchmark hidden in this gate.
for(const source of [' '.repeat(50000),'\n'.repeat(50000),'x'.repeat(50000),'\u0000 '.repeat(25000)])for(const n of [32,128])for(const mode of ['space','LF'] as const){assert.equal(pinakasUndo(pinakasFold(source,n,mode),n,mode),source);checks++;}
assert.throws(()=>pinakasUndo(pinakasFold('a b',32,'space')+'\n'+pinakasFold('c',32,'space'),32,'space'));checks++;
// Structural attacker: insertion tableau alone loses original order.
const a=pinakasInsert(['b','a','c']),b=pinakasInsert(['b','c','a']);assert.deepEqual(a.rows,b.rows);assert.notDeepEqual(a.trace,b.trace);checks+=2;
const files=[...fs.readFileSync('bench/x177/lanes.txt','utf8').trim().split('\n'),...fs.readdirSync('bench/x177/fixtures').map(f=>'bench/x177/fixtures/'+f),...JSON.parse(fs.readFileSync('bench/x178/receipts/heldout-sources.json','utf8')).map((r:{file:string})=>r.file)];const rows=[];
for(const path of files){const bytes=fs.readFileSync(path),source=bytes.toString();if(/[^\x00-\x7f]/.test(source)){rows.push({path,status:'unsupported ASCII domain'});continue;}const plans=pinakasPlans(source);for(const p of plans){assert.ok(Buffer.from(pinakasRead(p.message)).equals(bytes));assert.equal(decode(encode(p.message)),p.message);checks+=2;}rows.push({path,raw:encode(source).length,plans,status:'exact'});}
fs.writeFileSync('bench/x178/receipts/unit-pairs.json',JSON.stringify(pairs));fs.writeFileSync('bench/x178/receipts/screen.json',JSON.stringify({checks,rows},null,2));console.log({checks,sources:rows.length,rawWins:rows.filter(r=>r.plans?.some(p=>p.tokens<r.raw!)).map(r=>r.path)});
