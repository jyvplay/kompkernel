/** Executed cheap-parent alternative, not assumed equivalent to full TAGSTACK. */
import * as fs from 'node:fs';
import assert from 'node:assert/strict';
import {chironEncode,chironDecode,chironOpsUsed} from '../../src/lib/omega/chiron';
import {kremaOverflowPlan,kremaOverflowUndo,kremaParameters,kremaOverflowKey} from '../../src/lib/omega/krema';
import {encode} from 'gpt-tokenizer/encoding/o200k_base';
process.env.OMEGA_DET='1';process.env.OMEGA_NO_MEMO='1';process.env.OMEGA_ENGRAM='0';process.env.OMEGA_OURA_MEMO='0';process.env.OMEGA_NO_OROTHESIA='1';
for(const path of ['bench/holdout-x41/node-help.txt',...fs.readdirSync('bench/x137/heldout').filter(s=>s.endsWith('.txt')).map(s=>'bench/x137/heldout/'+s)]){
 const text=fs.readFileSync(path,'utf8'),p=kremaParameters(text)[0];if(!p)continue;
 const plan=kremaOverflowPlan(text,p.width,p.indent)!;
 const start=performance.now(),parent=chironEncode(plan.folded,'o200k_base',{noBlocks:true}),ms=performance.now()-start;
 const ops=chironOpsUsed(parent.wire);if(ops.rep||ops.fill||ops.range||ops.split){console.log(JSON.stringify({path,unsupportedOps:true,ms}));continue;}
 assert.equal(kremaOverflowUndo(chironDecode(parent.wire),p.width,p.indent,plan.escapes>0),text);
 const message=kremaOverflowKey(p.width,p.indent,plan.escapes>0)+parent.wire;
 console.log(JSON.stringify({path,width:p.width,indent:p.indent,escapes:plan.escapes,B:encode(message).length,ms,sourceExact:true,message}));
}
