import fs from 'node:fs';import {build} from 'esbuild';
const anchor='export function tokenStrings(text: string, enc: EncodingName): { id: number; s: string }[] {';
const replacement=`// X161 benchmark: bounded memo of complete per-token streaming decode results.
const tokenMemo = new Map<string,{id:number;s:string}[]>();
let tokenMemoWeight=0;
export function tokenStrings(text:string,enc:EncodingName):{id:number;s:string}[]{
 const key=enc+'\\0'+text,hit=tokenMemo.get(key);
 if(hit){flushDecoder();return hit.map(t=>({...t}));}
 const out=tokenStringsUncached(text,enc),weight=key.length+out.length*16;
 if(weight<=500000){if(tokenMemoWeight+weight>500000||tokenMemo.size>=4096){tokenMemo.clear();tokenMemoWeight=0;}
 tokenMemo.set(key,out.map(t=>({...t})));tokenMemoWeight+=weight;}
 return out;
}
function tokenStringsUncached(text: string, enc: EncodingName): { id: number; s: string }[] {`;
for(const entry of ['speed','token-gate'])for(const arm of ['A','B'])await build({entryPoints:[entry==='speed'?'bench/x155/speed.ts':'bench/x161/token-gate.ts'],bundle:true,platform:'node',format:'esm',outfile:`bench/x161/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'token-stream-memo',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},a=>{let s=fs.readFileSync(a.path,'utf8');if(s.split(anchor).length!==2)throw Error('anchor');return {contents:s.replace(anchor,replacement),loader:'ts'};});}}]});
fs.writeFileSync('bench/x161/receipts/speed-patch.json',JSON.stringify({anchor,replacement,production:false,scope:'complete token-stream memo; defensive copies; encoding key; flush on hit; bounded weight and entries'},null,2));

// Second, separate experiment: bounded native merge cache, no token-stream memo.
for(const arm of ['A','B'])await build({entryPoints:['bench/x155/speed.ts'],bundle:true,platform:'node',format:'esm',outfile:`bench/x161/cache-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'small-native-merge-cache',setup(b){b.onLoad({filter:/[\\/]bpe\.ts$/},a=>({contents:fs.readFileSync(a.path,'utf8').replace('setO200kMergeCacheSize(0);','setO200kMergeCacheSize(2048);').replace('setCl100kMergeCacheSize(0);','setCl100kMergeCacheSize(2048);'),loader:'ts'}));}}]});
