import * as fs from 'node:fs';
import {kremaParameters,kremaPlan} from '../../src/lib/omega/krema';
import {countTokens} from '../../src/lib/omega/bpe';
for(const path of fs.readFileSync('bench/x109/lanes29.txt','utf8').trim().split('\n')){
 const text=fs.readFileSync(path,'utf8'),t=performance.now();
 const plans=kremaParameters(text).map(p=>{const plan=kremaPlan(text,p.width,p.indent)!;return {...plan,rawDelta:countTokens(plan.folded,'o200k_base')-countTokens(text,'o200k_base')};});
 console.log(JSON.stringify({path,ms:performance.now()-t,plans}));
}
