import fs from 'node:fs';import {build} from 'esbuild';
const old=`    let s = '';
    for (const slot of state.patternSlots[i]) s += after[slot];
    let v = cache.get(s);
    if (v === undefined) { v = countTokens(s, enc); cache.set(s, v); }`;
const replacement=`    const slots=state.patternSlots[i];
    let v:number|undefined;
    if(slots.length===2 && after[slots[0]].length===1 && after[slots[1]].length===1){
      const a=after[slots[0]],b=after[slots[1]],key=(a.charCodeAt(0)<<16)|b.charCodeAt(0);
      v=pairCache.get(key);
      if(v===undefined){const s=a+b;v=cache.get(s);if(v===undefined){v=countTokens(s,enc);cache.set(s,v);}if(pairCache.size>=262144)pairCache.clear();pairCache.set(key,v);}
    }else{
      let s='';for(const slot of slots)s+=after[slot];v=cache.get(s);
      if(v===undefined){v=countTokens(s,enc);cache.set(s,v);}
    }`;
fs.writeFileSync('bench/x155/receipts/speed-patch.json',JSON.stringify({old,replacement,note:'two UTF16-code-unit strings have injective signed32 numeric keys; caches separated by encoding, bounded262144; workTick and acceptance updates unchanged'},null,2));
for(const entry of ['speed','scorer-gate'])for(const arm of ['A','B'])await build({entryPoints:[`bench/x155/${entry}.ts`],bundle:true,platform:'node',format:'esm',outfile:`bench/x155/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'pair-cost-key',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},args=>{let s=fs.readFileSync(args.path,'utf8'),start=s.indexOf('export function scoreRunCostDeltaSlots('),end=s.indexOf('/** Apply a `scoreRunCostDeltaSlots`',start);if(start<0||end<0)throw Error('scope');let body=s.slice(start,end);if(body.split(old).length!==2)throw Error('patch mismatch');body=body.replace('  workTick();','  const pairCache=enc===\'o200k_base\'?X155_PAIRS_O:X155_PAIRS_C;\n  workTick();').replace(old,replacement);s=s.slice(0,start)+'const X155_PAIRS_O=new Map<number,number>(),X155_PAIRS_C=new Map<number,number>();\n'+body+s.slice(end);return {contents:s,loader:'ts'};});}}]});
