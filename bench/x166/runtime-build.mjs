import fs from 'node:fs';import {build} from 'esbuild';
const path='src/lib/omega/ariadne.ts',original=fs.readFileSync(path,'utf8');
const anchor='    const cache = new Map<string, number>();';
if(original.split(anchor).length!==2)throw Error('runtime anchor drift');
const helper=`
class X166Cache extends Map<string,number> {
 chars=0;
 override set(k:string,v:number){
  if(!this.has(k)){
   if(this.size>=32768||this.chars+k.length>1048576){this.clear();this.chars=0;}
   this.chars+=k.length;
  }
  return super.set(k,v);
 }
}
`;
const patched=original.replace(anchor,'    const cache = new X166Cache();')+helper;
for(const arm of 'AB')for(const [entry,file] of [['speed','bench/x163/cache-speed.ts'],['unit','bench/x164/speed-unit.ts'],['target','bench/x165/speed-target.ts']])await build({entryPoints:[file],bundle:true,platform:'node',format:'esm',outfile:`bench/x166/${entry}-${arm}.mjs`,plugins:arm==='A'?[]:[{name:'bounded-local-run-memo',setup(b){b.onLoad({filter:/[\\/]ariadne\.ts$/},()=>({contents:patched,loader:'ts'}));}}]});
fs.writeFileSync('bench/x166/receipts/runtime-patch.json',JSON.stringify({production:false,path,anchor,helper,scope:'one per-assignment exact count cache, not global cache or search-budget change'},null,2));
