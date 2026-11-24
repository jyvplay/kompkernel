import fs from 'node:fs';import {build} from 'esbuild';
fs.mkdirSync('.cache/x167',{recursive:true});
await build({entryPoints:['bench/x163/cache-speed.ts'],bundle:true,platform:'node',format:'esm',outfile:'bench/x167/heap-worker.mjs',plugins:[{name:'retained-heap-observation',setup(b){
 b.onLoad({filter:/[\\/]metathesis\.ts$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace('  const mkConv = translationFn(orig);','  (globalThis as any).__x167Relayout=true;\n  const mkConv = translationFn(orig);'),loader:'ts'}));
 b.onLoad({filter:/[\\/]bpe\.ts$/},args=>{let s=fs.readFileSync(args.path,'utf8');s="import {writeHeapSnapshot as x167Snapshot} from 'node:v8';\nlet x167Calls=0;\n"+s;s=s.replace('export function countTokens(text: string, enc: EncodingName): number {',`export function countTokens(text: string, enc: EncodingName): number {
 if((globalThis as any).__x167Relayout&&++x167Calls%1000===0&&process.memoryUsage().heapUsed>150*1024*1024){console.error(JSON.stringify({event:'snapshot-start',memory:process.memoryUsage(),calls:x167Calls,chunk:chunkCacheStats(),tail:tailMemoStats()}));x167Snapshot('.cache/x167/requests.heapsnapshot');console.error('snapshot-complete; deliberate diagnostic exit86');process.exit(86);}`);return {contents:s,loader:'ts'};});
}}]});
