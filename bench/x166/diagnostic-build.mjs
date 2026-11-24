import fs from 'node:fs';import {build} from 'esbuild';
const helper=`
class X166DiagnosticCache extends Map<string,number>{
 chars=0;
 override set(k:string,v:number){if(!this.has(k)){this.chars+=k.length;if(this.size%65536===0&&this.size)console.error(JSON.stringify({event:'local-run-memo',entries:this.size,chars:this.chars,heap:process.memoryUsage().heapUsed}));}return super.set(k,v);}
}
`;
await build({entryPoints:['bench/x163/cache-speed.ts'],bundle:true,platform:'node',format:'esm',outfile:'bench/x166/diagnostic.mjs',plugins:[{name:'memory-stage-observation',setup(b){b.onLoad({filter:/[\\/](ariadne|tagstack)\.ts$/},args=>{let s=fs.readFileSync(args.path,'utf8');if(args.path.endsWith('ariadne.ts'))s=s.replace('    const cache = new Map<string, number>();','    const cache = new X166DiagnosticCache();')+helper;else{s=s.replace('const E = <T,>(fn: () => T): T => workEpoch(workBudgetFor(text.length), fn, text.length);',`const E = <T,>(fn: () => T): T => {console.error(JSON.stringify({event:'parent-start',fn:fn.toString(),heap:process.memoryUsage().heapUsed}));const r=workEpoch(workBudgetFor(text.length),fn,text.length);console.error(JSON.stringify({event:'parent-end',heap:process.memoryUsage().heapUsed}));return r;};`);}return {contents:s,loader:'ts'};});}}]});
fs.writeFileSync('bench/x166/receipts/diagnostic-scope.json',JSON.stringify({production:false,changes:'Log local ARIADNE memo entries/key characters every 65536 insertions; log TAGSTACK parent start/end heap. No candidate search/price changes.',purpose:'Localize prior Requests OOM; instrumentation timings are not baseline speed measurements'},null,2));
