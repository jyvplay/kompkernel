import fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { apographeEncode, apographeDecodeResult } from '../../src/lib/omega/apographe';
const file='bench/holdout-ops/find-listing.txt';
const text=fs.readFileSync(file,'utf8');
const suffix='.js';
const lines=text.split('\n');
if(lines.filter(Boolean).some(l=>{const m=l.match(/^(.*?\s+)([^\s]+)$/);return !m||!m[2].includes('/')||!m[2].endsWith(suffix)})) throw new Error('not every non-empty line is a path with target suffix');
const body=lines.map(l=>{if(!l)return l;const m=l.match(/^(.*?\s+)([^\s]+)$/)!;return m[1]+m[2].slice(0,-suffix.length)}).join('\n');
const p=apographeEncode(body,'o200k_base');
const restored=apographeDecodeResult(p);
const inverse=(s:string)=>s.split('\n').map(l=>{const m=l.match(/^(.*?\s+)([^\s]+)$/);return m?m[1]+m[2]+suffix:l}).join('\n');
const clauses=[
  'After decoding, append ".js" to every final path field; print only.',
  'Every final path field ends with .js; restore it. Print only.',
  'Append .js to every path field. Print only.',
  'Append .js to each final path. Print only.',
  'Every path ends in .js. Print only.',
  'All paths end with .js. Print only.',
  'Paths end in .js. Print only.',
  'Append ".js" to all paths. Print only.',
];
const results=clauses.map(c=>{const contract=p.contract?p.contract.replace(/; print only\.$/,` ${c}`):c;const message=contract+'\n'+p.wire;return {clause:c,M:countTokens(message,'o200k_base'),contract}});
console.log(JSON.stringify({file,raw:countTokens(text,'o200k_base'),parentM:1267,hits:lines.length,apographeM:p.messageTokens,apographeParent:p.apographeParentTokens,exact:restored===body&&inverse(restored)===text,results},null,2));
