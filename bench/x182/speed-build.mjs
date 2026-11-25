import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/bpe-fast.ts','utf8');const old=`    for (let i = bi + 1; i < len - 1; i++) starts[i] = starts[i + 1];
    for (let i = bi; i < len - 1; i++) ranks[i] = ranks[i + 1];`;
const replacement=`    if (len - bi >= 32) {
      starts.copyWithin(bi + 1, bi + 2, len);
      ranks.copyWithin(bi, bi + 1, len);
    } else {
      for (let i = bi + 1; i < len - 1; i++) starts[i] = starts[i + 1];
      for (let i = bi; i < len - 1; i++) ranks[i] = ranks[i + 1];
    }`;
if(original.split(old).length!==2)throw Error('anchor');
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts'],['merge','bench/x182/merge-attack.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x182/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'merge-memmove',setup(b){b.onLoad({filter:/[\\/]bpe-fast\.ts$/},()=>({contents:original.replace(old,replacement),loader:'ts'}));}}]});
fs.writeFileSync('bench/x182/receipts/speed-patch.json',JSON.stringify({production:false,old,replacement,scope:'Native overlap-safe typed-array moves for >=32 remaining boundaries; same rank scan, leftmost tie rule, rank updates and candidate set.'},null,2));
