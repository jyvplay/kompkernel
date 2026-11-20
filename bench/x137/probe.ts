import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {tagstackEncode} from '../../src/lib/omega/tagstack';
import {kremaPlan,kremaParameters,kremaUndo,kremaKey,kremaOverflowPlan,kremaOverflowUndo,kremaOverflowKey} from '../../src/lib/omega/krema';
import {readParent} from '../x135/reader';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
const old=new Map(fs.readFileSync('bench/x136/receipts/candidate-frontier.jsonl','utf8').trim().split('\n').map(l=>{const r=JSON.parse(l);return[r.path,r]}));
const heldout=process.argv.includes('--heldout'),overflow=process.argv.includes('--overflow');
const paths=heldout?fs.readdirSync('bench/x137/heldout').filter(s=>s.endsWith('.txt')).map(s=>'bench/x137/heldout/'+s):[...old.keys()];
for(const path of paths){const text=fs.readFileSync(path,'utf8'),params=kremaParameters(text);if(!params.length){console.log(JSON.stringify({path,eligible:false}));continue;}
 let A=old.get(path)?.tokens,baselineMs=0;
 if(heldout){const t=performance.now(),base=tagstackEncode(text,'o200k_base');baselineMs=performance.now()-t;assert.equal(base.decoded,text);A=encode(base.message).length;fs.appendFileSync('bench/x137/receipts/heldout-baseline.jsonl',JSON.stringify({path,tokens:A,ms:baselineMs,message:base.message,text})+'\n');}
 const trials=heldout?params.slice(0,1):params;
 for(const p of trials){const plan=overflow?kremaOverflowPlan(text,p.width,p.indent):kremaPlan(text,p.width,p.indent);if(!plan)continue;
 const t=performance.now(),parent=tagstackEncode(plan.folded,'o200k_base'),ms=performance.now()-t;
 const pre=['¶ k=v. expand repeatedly; print only.\n','Before ¶ k=v. expand repeatedly; print only.\n'].find(s=>parent.message.startsWith(s+'§'));
 if(!pre){console.log(JSON.stringify({path,eligible:true,unsupportedParent:true,width:p.width,indent:p.indent,ms}));continue;}
 const escapes='escapes'in plan&&plan.escapes>0;
 const key=overflow?kremaOverflowKey(p.width,p.indent,escapes):kremaKey(p.width,p.indent);
 const message=key+parent.message.slice(pre.length);let sourceExact=false;
 try{const layer=readParent(parent.message);sourceExact=Buffer.from(overflow?kremaOverflowUndo(layer,p.width,p.indent,escapes):kremaUndo(layer,p.width,p.indent)).equals(fs.readFileSync(path));}catch{}
 const B=encode(message).length;
 console.log(JSON.stringify({path,A,B,delta:B-A!,ms,baselineMs,sourceExact,...plan,message}));
 }
}
