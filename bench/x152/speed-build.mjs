import {build} from 'esbuild';import fs from 'node:fs';
const old=`    let cps: number[];
    try { cps = [...str].map(c => c.codePointAt(0)!); } catch { continue; }
    for (const sc of CHIRON_SCRIPTS) {
      let all = true;
      for (const c of cps) if (!chironInScript(sc, c)) { all = false; break; }
      if (all) { out.get(sc.name)!.push(str); break; }
    }`;
const replacement=`    const first = str.codePointAt(0)!;
    for (const sc of CHIRON_SCRIPTS) {
      if (!chironInScript(sc, first)) continue;
      let all = true;
      for (const c of str) if (!chironInScript(sc, c.codePointAt(0)!)) { all = false; break; }
      if (all) { out.get(sc.name)!.push(str); break; }
    }`;
fs.writeFileSync('bench/x152/receipts/speed-change.json',JSON.stringify({old,replacement},null,2));
for(const arm of ['A','B'])await build({entryPoints:['bench/x152/speed.ts'],bundle:true,platform:'node',format:'esm',outfile:`bench/x152/speed-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'allocation-free-vocab-rejection',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},args=>{const src=fs.readFileSync(args.path,'utf8');if(src.split(old).length!==2)throw Error('patch mismatch');return {contents:src.replace(old,replacement),loader:'ts'};});}}]});
