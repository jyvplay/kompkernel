import * as fs from 'node:fs';import assert from 'node:assert/strict';
import {colexPlans,colexUndo} from '../../src/lib/omega/colex';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const rows=fs.readFileSync(process.argv[2]??'bench/x144/receipts/frontier.jsonl','utf8').trim().split('\n').map(l=>JSON.parse(l));
// Fixed budget: best complete standalone plan/source, top six by folded raw
// savings. Ranking is not a bound on full-parent gains; omitted sources unknown.
const candidates=rows.flatMap(a=>{const text=fs.readFileSync(a.path,'utf8'),p=colexPlans(text).sort((a,b)=>a.tokens-b.tokens)[0];return p?[{a,text,p,score:encode(text).length-encode(p.folded).length}]:[];});
candidates.sort((a,b)=>b.score-a.score);
for(const {a,text,p,score}of candidates.filter(x=>['bench/holdout-work/kb-article.txt','bench/holdout-work/email-thread.txt','bench/holdout-x41/du-real.txt','bench/holdout-x41/apt-real.txt'].includes(x.a.path))){
 const t=performance.now(),q=tagstackEncode(p.folded),ms=performance.now()-t;assert.equal(colexUndo(q.decoded,p.sep),text);
 const message=p.contract+q.message;console.log(JSON.stringify({path:a.path,A:a.tokens,B:encode(message).length,ms,score,sourceExact:true,...p,message,parentMessage:q.message}));
}
