import fs from 'node:fs';
import {polytroposEncode} from '@/lib/omega/polytropos';
import {chironDecode} from '@/lib/omega/chiron';
import {psephosCollapse,psephosContract} from '@/lib/omega/psephos';
const enc='o200k_base' as any;
const files=['bench/holdout-tab/vix-daily-1990.csv'];
const dir='bench/x24/receipts/selfdecode';
for(const f of files){
  const text=fs.readFileSync(f,'utf8');
  const name=f.split('/').pop()!.replace(/\.[^.]+$/,'');
  // reproduce the shipped 'in' configuration: collapse first, then polytropos
  const c=psephosCollapse(text);
  const p:any=polytroposEncode(c.text,enc);
  const wire=String(p.wire);
  const contract=String(p.decoderPrompt).slice(wire.length+1);
  const clause=psephosContract(c.stats);
  const full=contract?`${contract} ${clause}`:clause;
  fs.writeFileSync(`${dir}/${name}.wire`,wire,{encoding:'utf8'});
  fs.writeFileSync(`${dir}/${name}.contract.txt`,full,{encoding:'utf8'});
  fs.writeFileSync(`${dir}/${name}.original`,text,{encoding:'utf8'});
  fs.writeFileSync(`${dir}/${name}.case.json`,JSON.stringify({
    name, order:'in',
    wire_path:`${dir}/${name}.wire`,
    original_path:`${dir}/${name}.original`,
    formats:c.stats.formats.map(x=>({name:x.name,mode:x.mode,sentinel:x.sentinel,enabled:x.enabled})),
  },null,2),{encoding:'utf8'});
  // sanity: TS-side round trip
  const rt=psephosUncollapseLocal(chironDecode(wire),c.stats);
  console.log(name,'| collapsed',c.stats.totalCollapsed,'| modes',c.stats.formats.map(x=>`${x.name}:${x.mode}${x.sentinel||''}`).join(','),'| TS roundtrip',rt===text,'| contract',JSON.stringify(clause));
}
function psephosUncollapseLocal(t:any,s:any){ // lazy import to keep types simple
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const m=require('@/lib/omega/psephos'); return m.psephosUncollapse(t,s);
}
