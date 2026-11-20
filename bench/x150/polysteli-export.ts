import fs from 'node:fs';
import {polysteliTransform,polysteliUndo} from '../../src/lib/omega/polysteli';
for (const [i,path] of ['bench/holdout-x41/ls-l-real.txt','bench/holdout-x41/ps-aux-real.txt','bench/holdout-x42/ps-ef.txt','bench/holdout-tbl/kubectl-get-pods.txt'].entries()){
 const bytes=fs.readFileSync(path),source=bytes.toString('utf8'),plan=polysteliTransform(source);
 if(!plan || !Buffer.from(polysteliUndo(plan.text)).equals(bytes))throw Error('source mismatch '+path);
 fs.writeFileSync(`bench/x150/receipts/polysteli-folded-${i}.txt`,plan.text);
 console.log(JSON.stringify({path,markers:plan.markers,sourceChars:source.length,foldedChars:plan.text.length}));
}
