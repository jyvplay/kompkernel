import fs from 'node:fs';import {build} from 'esbuild';
const original=fs.readFileSync('src/lib/omega/prolepsis.ts','utf8');const start=original.indexOf('    const L = lcp(a.text, text, limit);'),end=original.indexOf('    const p = a.pos[k]!;',start);if(start<0||end<0)throw Error('anchor');
const replacement=`    // Search only needed checkpoint predicates, not the exact mismatch index.
    let lo=0,hi=a.n-1,k=-1;
    while(lo<=hi){const mid=(lo+hi)>>>1,p=a.pos[mid]!;
      if(p>limit){hi=mid-1;continue;}
      lcpWork+=p; // attempted prefix units; diagnostic meaning differs from baseline
      if(text.startsWith(a.text.slice(0,p))){k=mid;lo=mid+1;}else hi=mid-1;
    }
    if(k<0)continue;
`;
const patched=original.slice(0,start)+replacement+original.slice(end);
for(const arm of ['A','B'])for(const [name,entry] of [['speed','bench/x164/cache-speed.ts'],['count','bench/x163/count-gate.ts'],['vector','bench/x164/speed-unit.ts']])await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',outfile:`bench/x177/${name}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'checkpoint-prefix-search',setup(b){b.onLoad({filter:/[\\/]prolepsis\.ts$/},()=>({contents:patched,loader:'ts'}));}}]});
fs.writeFileSync('bench/x177/receipts/speed-patch.json',JSON.stringify({production:false,scope:'Binary search monotone exact prefix-equality predicates at stored marks; preserve largest usable mark, anchor order, tie rules and counts. lcpWork diagnostic changes to attempted prefix units.',original:original.slice(start,end),replacement},null,2));
