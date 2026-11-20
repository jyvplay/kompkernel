import fs from 'node:fs';import {splitPlan} from './polysteli-split';import {countTokens} from '../../src/lib/omega/bpe';import {polysteliUndo,polysteliTransform} from '../../src/lib/omega/polysteli';
for(const path of ['bench/holdout-x41/ls-l-real.txt','bench/holdout-x41/ps-aux-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout-tbl/kubectl-get-pods.txt']){
 const source=fs.readFileSync(path,'utf8'),p=splitPlan(source),one=polysteliTransform(source);if(!p||!one||polysteliUndo(p.text)!==source)throw Error(path);
 const row={path,grids:p.grids,source:countTokens(source,'o200k_base'),one:countTokens(one.text,'o200k_base'),split:countTokens(p.text,'o200k_base')};
 fs.writeFileSync(`bench/x150/receipts/split-${path.split('/').at(-1)}`,p.text);console.log(JSON.stringify(row));
}
