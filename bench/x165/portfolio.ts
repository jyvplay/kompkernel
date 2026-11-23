import fs from 'node:fs';import assert from 'node:assert/strict';import {encode} from 'gpt-tokenizer/encoding/o200k_base';import {blockSort,blockUndo} from './block-sort';import {deiktisPlans} from '../../src/lib/omega/deiktis';import {colexPlans} from '../../src/lib/omega/colex';import {lexarithmosPlan,LEXARITHMOS_KEY} from '../../src/lib/omega/lexarithmos';
const paths=[...fs.readFileSync('bench/x165/lanes.txt','utf8').trim().split('\n'),...fs.readdirSync('bench/x165/fixtures').map(n=>'bench/x165/fixtures/'+n)];const rows=[];
for(const path of paths){const source=fs.readFileSync(path,'utf8'),raw=encode(source).length,plans=deiktisPlans(source),b=blockSort(source);assert.equal(blockUndo(b.folded,b.index),source);const l=lexarithmosPlan(source),c=colexPlans(source);
 // Orthographic experiment is deliberately limited to a losslessly marked arm;
 // no assumption that original camelCase can be distinguished from joined text.
 const camel=source.includes('^')?null:source.replace(/\b([a-z]+) ([a-z]+)\b/g,(_,a,b)=>'^'+a+b[0].toUpperCase()+b.slice(1));
 if(camel!==null)assert.equal(camel.replace(/\^([a-z]+)([A-Z])([a-z]*)/g,(_,a,b,c)=>a+' '+b.toLowerCase()+c),source);
 const camelKey='Decode first. In ^lowerUpper words, remove ^ and insert a space before the uppercase letter, lowercasing it. Preserve everything else; print only.\n';
 rows.push({path,raw,deiktis:plans,blockSort:b,colex:c.map(p=>({sep:p.sep,tokens:p.tokens})),lexarithmos:l?{tokens:encode(LEXARITHMOS_KEY+l.folded).length,sites:l.sites}:null,camel:camel===null?null:{tokens:encode(camelKey+camel).length},native:'NOT_RUN'});
}
fs.writeFileSync('bench/x165/receipts/portfolio.json',JSON.stringify({scope:'34whole sources; raw-complete screens, not full-parent results',rows},null,2));console.log(rows.map(r=>({path:r.path,raw:r.raw,deiktis:r.deiktis[0]?.tokens,bwt:r.blockSort.tokens,camel:r.camel?.tokens})));
