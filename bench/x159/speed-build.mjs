import fs from 'node:fs';import {build} from 'esbuild';
const anchor='    const L = lcp(a.text, text, limit);';
const patch=`    // X159: any differing sampled character before the earliest useful mark
    // proves that this anchor cannot improve bestPos. Equality is not assumed.
    let first=0;
    while(first<a.n && (a.pos[first]<=bestPos || a.pos[first]<minPrefix))first++;
    if(first===a.n || a.pos[first]>limit)continue;
    const upto=a.pos[first];
    let reject=false;
    for(const q of [upto-1,upto>>>1,upto>>>2,(upto*3)>>>2]){
      if(a.text.charCodeAt(q)!==text.charCodeAt(q)){reject=true;break;}
    }
    if(reject){gateStops++;continue;}
${anchor}`;
for(const entry of ['speed','bpe-gate','prefix-gate'])for(const arm of ['A','B'])await build({entryPoints:[entry==='speed'?'bench/x155/speed.ts':`bench/x159/${entry}.ts`],bundle:true,platform:'node',format:'esm',outfile:`bench/x159/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'negative-prefix-witness',setup(b){b.onLoad({filter:/[\\/]prolepsis\.ts$/},a=>{const s=fs.readFileSync(a.path,'utf8');if(s.split(anchor).length!==2)throw Error('anchor');return {contents:s.replace(anchor,patch),loader:'ts'};});}}]});
fs.writeFileSync('bench/x159/receipts/speed-patch.json',JSON.stringify({anchor,patch,production:false,proof:'If a sampled position q<p differs, LCP<=q<p, so no anchor mark at or after the first useful p can be shared. Equal samples still use full LCP; no probabilistic acceptance.'},null,2));
