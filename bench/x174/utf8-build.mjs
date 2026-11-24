import fs from 'node:fs';import {build} from 'esbuild';
const old='    if (ascii) return mergeCount(SB, L);\n    bytes = TE.encode(chunk);';
const replacement='    if (ascii) return mergeCount(SB, L);\n    if (L * 3 <= SCRATCH_MAX) return mergeCount(SB, x174Utf8(chunk, SB));\n    bytes = TE.encode(chunk);';
const helper=fs.readFileSync('bench/x174/utf8-target.ts','utf8').replace('export function','function');
for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x174/${name}-C.mjs`,plugins:[{name:'manual-utf8-scratch',setup(b){b.onLoad({filter:/[\\/]bpe-fast\.ts$/},a=>{const s=fs.readFileSync(a.path,'utf8');if(s.split(old).length!==2)throw Error('anchor');return {contents:helper+'\n'+s.replace(old,replacement),loader:'ts'};});}}]});
fs.writeFileSync('bench/x174/receipts/utf8-patch.json',JSON.stringify({production:false,old,replacement,scope:'Manual UTF-8 scratch only, without hash-table patch; <=341 UTF-16 units, replacement semantics for lone surrogates; otherwise original path'},null,2));
