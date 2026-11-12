/**
 * X110 — PER-PARENT FRONTIER COSTS on all 29 lanes.
 * tagstackFrontier already returns frontierCosts for every parent it measured.
 * This prints them so the headroom is visible per lane and per parent, instead
 * of being inferred from a single winning number.
 */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET='1'; process.env.OMEGA_NO_MEMO='1'; process.env.OMEGA_ENGRAM='0'; process.env.OMEGA_OURA_MEMO='0'; process.env.OMEGA_NO_OROTHESIA='1';
const enc:any='o200k_base';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
const cols=['synkrisis','bifront','kanon','akolouthia2','apographe','metron','hemera','diastema'];
const agg:Record<string,number[]>={};
for(const c of cols) agg[c]=[];
for(const p of lanes){
  const text=fs.readFileSync(p,'utf8');
  const r:any=tagstackFrontier(text,enc);
  const fc:any=r.frontierCosts??{};
  const cells=cols.map(c=>fc[c]!==undefined?String(fc[c]):'-');
  cols.forEach((c,i)=>{ if(cells[i]!=='-') agg[c]!.push(Number(cells[i])); });
  console.log(`${p.split('/').pop()!.padEnd(22)} raw ${String(r.inTokens).padStart(5)}  F ${String(r.messageTokens).padStart(5)}  win=${String(r.parentCodec).padEnd(12)} ${cols.map((c,i)=>c.slice(0,5)+':'+cells[i]).join(' ')}`);
}
console.log('\nparent            lanes  total   min    max');
for(const c of cols){ const v=agg[c]!; if(!v.length) continue;
  console.log(`${c.padEnd(16)} ${String(v.length).padStart(5)} ${String(v.reduce((a,b)=>a+b,0)).padStart(6)} ${String(Math.min(...v)).padStart(6)} ${String(Math.max(...v)).padStart(6)}`); }
