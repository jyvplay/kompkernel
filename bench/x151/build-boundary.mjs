// Build a test-only variant: advance the module's initial generation counter.
// This injects a state boundary; it does not replace the algorithm under test.
import {build} from 'esbuild';import fs from 'node:fs';
await build({entryPoints:['bench/x151/generation-boundary.ts'],bundle:true,platform:'node',format:'esm',outfile:'bench/x151/generation-boundary.mjs',plugins:[{name:'seed-near-wrap',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},args=>{const src=fs.readFileSync(args.path,'utf8'),needle='let AFF_GEN_COUNTER = 0;';if(src.split(needle).length!==2)throw Error('counter location changed');return {contents:src.replace(needle,'let AFF_GEN_COUNTER = 2147483646;'),loader:'ts'};});}}]});
