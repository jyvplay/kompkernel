import fs from 'node:fs';import {chrismataPlan} from '../../src/lib/omega/chrismata';
const paths=fs.readFileSync('bench/x150/lanesA.txt','utf8').split('\n').concat(fs.readFileSync('bench/x150/lanesB.txt','utf8').split('\n')).filter(Boolean);
if(paths.length!==29 || new Set(paths).size!==29)throw Error('lane list');
let fits=0;for(const path of paths){const s=fs.readFileSync(path,'utf8');if(chrismataPlan(s)){console.log('fit',path);fits++;}}
console.log(JSON.stringify({lanes:paths.length,fits}));
