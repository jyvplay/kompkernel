import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/bpe.ts','utf8');
const old=`        let tail = '';
        for (let j = tStart; j <= i; j++) tail += cs[j]!;
        if (tail.length <= 64) sink!.out.push({ pos: cpos, total: n, tail, tailTok: tTok });`;
const replacement=`        let tailUnits = 0;
        for (let j = i; j >= tStart && tailUnits <= 64; j--) tailUnits += cs[j]!.length;
        if (tailUnits <= 64) {
          let tail = '';
          for (let j = tStart; j <= i; j++) tail += cs[j]!;
          sink!.out.push({ pos: cpos, total: n, tail, tailTok: tTok });
        }`;
if(original.split(old).length!==2)throw Error('anchor');
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x180/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'bounded-tail-materialization',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},()=>({contents:original.replace(old,replacement),loader:'ts'}));}}]});
fs.writeFileSync('bench/x180/receipts/speed-patch.json',JSON.stringify({production:false,old,replacement,scope:'Avoid materializing tails already longer than the existing 64 UTF16-unit checkpoint cap; identical checkpoints required.'},null,2));
