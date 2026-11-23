import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/ariadne.ts','utf8');const start=original.indexOf('export function scoreRunCostDeltaSlots('),end=original.indexOf('/** Apply a `scoreRunCostDeltaSlots`',start);const part=original.slice(start,end);const anchor='  for (let k = 0; k < affCount; k++) {\n    const i = AFF_LIST[k];\n    if (total - maxSavingLeft > limit)';
if(part.split(anchor).length!==2)throw Error('anchor');
const order=`  // X164 fail-first: patterns already costing one token cannot save anything.
  // Evaluate them first; stable integer sum and admissible lower bound unchanged.
  if (limit !== Number.POSITIVE_INFINITY) {
    let front=0;
    for(let k=0;k<affCount;k++)if(state.costs[AFF_LIST[k]]===1){
      const t=AFF_LIST[front];AFF_LIST[front++]=AFF_LIST[k];AFF_LIST[k]=t;
    }
  }
`;
const replacement=original.slice(0,start)+part.replace(anchor,order+anchor)+original.slice(end);
for(const arm of 'AB')for(const [entry,file] of [['speed','bench/x163/cache-speed.ts'],['unit','bench/x164/speed-unit.ts']])await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',outfile:`bench/x164/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'fail-first-run-cost',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},()=>({contents:replacement,loader:'ts'}));}}]});
fs.writeFileSync('bench/x164/receipts/speed-patch.json',JSON.stringify({production:false,scope:'affected run-pattern evaluation order only; search order, work ticks, exact counts and rejection predicate unchanged',order},null,2));
