import fs from 'node:fs';
import {countTokens} from '@/lib/omega/bpe';
import {chironParseTape,CHIRON_SCRIPTS} from '@/lib/omega/chiron';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const lanes=fs.readFileSync('bench/x21/lanes.txt','utf8').trim().split('\n');
const which=(process.env.W||'').split(',').filter(Boolean).map(Number);

function splitWire(wire:string){
  const pi=wire.indexOf('\u00b6');
  if(pi<0) return null;
  let tape=wire.slice(0,pi); if(tape.startsWith('\u00a7')) tape=tape.slice(1);
  return {tape, sep:'\u00b6', body:wire.slice(pi+1)};
}
function build(tape:string,body:string){return '\u00a7'+tape+'\u00b6'+body;}
// rules[i] = {glyph, raw}; tape is reconstructed by concatenating glyph+raw
function parse(tape:string){
  let best:any[]=[];
  for(const sc of CHIRON_SCRIPTS){const r=chironParseTape(tape,sc); if(r&&r.length>best.length) best=r;}
  return best.map(r=>({glyph:String(r.glyph),raw:String(r.raw)}));
}
// fully expand rule g in a string, and in other rules' raws
function dropRule(rules:any[],idx:number){
  const g=rules[idx].glyph;
  const expand=(s:string)=>s.split(g).join(rules[idx].raw);
  const out=rules.filter((_,i)=>i!==idx).map(r=>({glyph:r.glyph,raw:r.raw===undefined?r.raw:expand(r.raw)}));
  return {rules:out, expand};
}
for(const i of which){
  const wf='bench/x24/wires/'+(i+1).toString().padStart(2,'0')+'.wire';
  if(!fs.existsSync(wf)){console.log('pending',lanes[i]);continue;}
  const wire0=fs.readFileSync(wf,'utf8');
  const sp=splitWire(wire0); if(!sp){console.log(lanes[i],'no tape');continue;}
  let rules=parse(sp.tape);
  let body=sp.body;
  const mkTape=(rs:any[])=>rs.map(r=>r.glyph+r.raw).join('');
  let cur=build(mkTape(rules),body); let curT=T(cur);
  const start=curT; let dropped=0;
  let improved=true; let guard=0;
  while(improved && guard++<200){
    improved=false;
    for(let k=rules.length-1;k>=0;k--){
      const {rules:nr,expand}=dropRule(rules,k);
      const cand=build(mkTape(nr),expand(body));
      const t=T(cand);
      if(t<curT){curT=t;cur=cand;rules=nr;body=expand(body);dropped++;improved=true;break;}
    }
  }
  console.log(lanes[i].split('/').pop()!.padEnd(30),'rules',String(rules.length).padStart(3),'wireTok',String(start).padStart(5),'->',String(curT).padStart(5),`(drop ${start-curT}, ${dropped} rules)`);
}
