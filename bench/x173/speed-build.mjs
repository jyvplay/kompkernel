import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/ariadne.ts','utf8');const start=original.indexOf('export function scoreRunCostDeltaSlots('),end=original.indexOf('/** Apply a `scoreRunCostDeltaSlots`',start);const part=original.slice(start,end),old="    let s = '';\n    for (const slot of state.patternSlots[i]) s += after[slot];";
if(part.split(old).length!==2)throw Error('anchor');
const replacement=`    const slots=state.patternSlots[i], L=slots.length;
    let s=L===1?after[slots[0]]:L===2?after[slots[0]]+after[slots[1]]:L===3?after[slots[0]]+after[slots[1]]+after[slots[2]]:L===4?after[slots[0]]+after[slots[1]]+after[slots[2]]+after[slots[3]]:'';
    if(L>4)for(let j=0;j<L;j++)s+=after[slots[j]];`;
const patched=original.slice(0,start)+part.replace(old,replacement)+original.slice(end);
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts'],['vector-target','bench/x173/vector-target.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x173/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'short-pattern-specialization',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},()=>({contents:patched,loader:'ts'}));}}]});
fs.writeFileSync('bench/x173/receipts/speed-patch.json',JSON.stringify({production:false,scope:'string assembly in delta scorer only; identical order, bounds, work ticks, and cache keys',old,replacement},null,2));
