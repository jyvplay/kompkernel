import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {haplographeFromFrontier,haplographeRead,HAPLOGRAPHE_KEY} from '../../src/lib/omega/haplographe';import {klimaxParentRead} from '../../src/lib/omega/klimax-parent';
const rows=[];let attacks=0;
for(const name of ['isolation','constructed']){
 const base=JSON.parse(fs.readFileSync(`bench/x160/receipts/${name}-base.json`,'utf8')),c=JSON.parse(fs.readFileSync(`bench/x160/receipts/${name}-candidate.json`,'utf8')),source=fs.readFileSync(c.path),text=source.toString();
 assert.ok(Buffer.from(klimaxParentRead(base.message)).equals(source));assert.ok(Buffer.from(haplographeRead(c.message,klimaxParentRead)).equals(source));assert.equal(encode(base.message).length,base.tokens);assert.equal(encode(c.message).length,c.tokens);
 const chosen=haplographeFromFrontier(text,base.message,klimaxParentRead,()=>c.parent,klimaxParentRead);assert.equal(chosen.tokens,Math.min(base.tokens,c.tokens));assert.equal(chosen.applied,c.tokens<base.tokens);
 for(const key of [HAPLOGRAPHE_KEY.replace('b/P','b/Q'),HAPLOGRAPHE_KEY.replace('index H M','index M H'),HAPLOGRAPHE_KEY.slice(1)]){assert.throws(()=>haplographeRead(key+c.parent,klimaxParentRead));attacks++;}
 const failed=haplographeFromFrontier(text,base.message,klimaxParentRead,()=>c.parent,()=>text+'bad');assert.equal(failed.message,base.message);attacks++;
 rows.push({name,baseline:base.tokens,candidate:c.tokens,saved:base.tokens-c.tokens,selected:chosen.tokens,applied:chosen.applied,sourceBytes:source.length,constructed:name==='constructed'});
 if(chosen.applied)fs.writeFileSync('bench/x160/receipts/native-packet.txt',chosen.message);
}
fs.writeFileSync('bench/x160/receipts/gate.json',JSON.stringify({rows,attacks,native:'NOT_RUN',paretoCertified:false},null,2));console.log(rows);
