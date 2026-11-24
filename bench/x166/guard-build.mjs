import fs from 'node:fs';import {build} from 'esbuild';import {spawnSync} from 'node:child_process';
const guard='if(message.length>SYMFRAZ_CAP+1000||!isUtf8TransportStable(message))return;';
for(const arm of ['repaired','old-control','old-incumbent']){
 await build({entryPoints:['bench/x166/guard-target.ts'],bundle:true,platform:'node',format:'esm',outfile:`bench/x166/guard-${arm}.mjs`,plugins:[{name:'count-oversize-work',setup(b){
 b.onLoad({filter:/[\\/]bpe\.ts$/},args=>{const s=fs.readFileSync(args.path,'utf8');return {contents:s.replace('export function countTokens(text: string, enc: EncodingName): number {','export function countTokens(text: string, enc: EncodingName): number { if(text.length>51000)(globalThis as any).__x166OversizePrices=((globalThis as any).__x166OversizePrices??0)+1;'),loader:'ts'};});
 b.onLoad({filter:/[\\/]utf8-wire\.ts$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace('export function isUtf8TransportStable(text:string):boolean {','export function isUtf8TransportStable(text:string):boolean { if(text.length>51000)(globalThis as any).__x166OversizeScans=((globalThis as any).__x166OversizeScans??0)+1;'),loader:'ts'}));
 if(arm!=='repaired')b.onLoad({filter:/[\\/]symfraz\.ts$/},args=>{let s=fs.readFileSync(args.path,'utf8');if(s.split(guard).length!==2)throw Error('guard drift');s=arm==='old-control'?s.replace(guard,''):s.replace('incumbent.length>SYMFRAZ_CAP+1000||!isUtf8TransportStable(incumbent)','!isUtf8TransportStable(incumbent)||incumbent.length>SYMFRAZ_CAP+1000');return {contents:s,loader:'ts'};});
 }}]});
 const r=spawnSync('node',[`bench/x166/guard-${arm}.mjs`],{encoding:'utf8'});fs.writeFileSync(`bench/x166/receipts/guard-${arm}.log`,r.stdout+r.stderr);if((arm==='repaired'&&r.status!==0)||(arm!=='repaired'&&r.status===0))throw Error('guard attack did not distinguish patch');
}
fs.writeFileSync('bench/x166/receipts/guard-target.json',JSON.stringify({repaired:'PASS',oldControl:'EXPECTED_FAIL',oldIncumbentOrder:'EXPECTED_FAIL',scope:'instrumented counters distinguish pre-price and pre-scan resource guards from late refusal'},null,2));
