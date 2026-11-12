import * as fs from 'node:fs';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
import { tachygrafiaRewrite } from '../../src/lib/omega/tachygrafia';
import { countTokens } from '../../src/lib/omega/bpe';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
for(const p of ['bench/holdout-tbl/kubectl-get-pods.txt','bench/holdout-tbl/psql-output.txt']){
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackEncode(text,enc);
  const msg:string=r.message;
  const start=msg.indexOf(CHIRON_START);
  console.log(`\n##### ${p}  messageTokens=${r.messageTokens}  § at ${start} of ${msg.length}`);
  let incExp:string|null=null; let threw='';
  if(start>=0){ try{ incExp=chironDecode(msg.slice(start)); }catch(e:any){ threw=String(e&&e.message||e); } }
  console.log(`  chironDecode(wire) -> ${incExp===null?'NULL':'len '+incExp.length}  threw=${threw}`);
  const rw=tachygrafiaRewrite(msg,enc,text);
  console.log(`  tachygrafiaRewrite: edits=${rw.edits.length} before=${rw.before} after=${rw.after}`);
  if(rw.edits.length>0){
    const cstart=rw.message.indexOf(CHIRON_START);
    let candExp:string|null=null;
    if(cstart>=0){ try{ candExp=chironDecode(rw.message.slice(cstart)); }catch{ candExp=null; } }
    const tok=countTokens(rw.message,enc);
    console.log(`  cand § at ${cstart}  candExp=${candExp===null?'NULL':'len '+candExp.length}  tok=${tok}  < ${r.messageTokens} ? ${tok<r.messageTokens}  expEqual=${candExp===incExp}`);
  }
}
