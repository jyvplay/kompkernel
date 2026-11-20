import fs from 'node:fs';import {polysteliTransform} from '../../src/lib/omega/polysteli';import {countTokens} from '../../src/lib/omega/bpe';
for(const path of ['bench/holdout-x41/ls-l-real.txt','bench/holdout-x41/ps-aux-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout-tbl/kubectl-get-pods.txt']){
 const source=fs.readFileSync(path,'utf8'), p=polysteliTransform(source);if(!p)throw Error(path);
 const raw=countTokens(source,'o200k_base'),folded=countTokens(p.text,'o200k_base');console.log(JSON.stringify({path,raw,folded,grossSaved:raw-folded}));
}
