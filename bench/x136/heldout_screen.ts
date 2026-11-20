import * as fs from 'node:fs';
import {ptycheDefaultPlan,ptycheWidth} from '../../src/lib/omega/ptyche';
const canonical=new Set(fs.readFileSync('bench/x109/lanes29.txt','utf8').trim().split('\n'));
for(const dir of ['bench/holdout-work','bench/holdout','bench/holdout-x40','bench/holdout-x41','bench/holdout-x42','bench/holdout-x42b']){
 for(const name of fs.readdirSync(dir)){
  if(!/\.(txt|md)$/.test(name))continue;
  const path=dir+'/'+name;if(canonical.has(path))continue;
  const text=fs.readFileSync(path,'utf8'),w=ptycheWidth(text),p=w===null?null:ptycheDefaultPlan(text,w);
  console.log(JSON.stringify({path,chars:text.length,width:w,eligible:!!p,blocks:p?.blocks??0,removedBreaks:p?.removedBreaks??0}));
 }
}
