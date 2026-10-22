import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;
// Measure: for line-structured lanes, how much would "inherit previous line's prefix" save?
// Model: for each line after the first, find longest common prefix with the PREVIOUS line
// (and with any earlier line). Cost if we write only the suffix + a marker.
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const lines=t.split('\n');
  if(lines.length<8) continue;
  let prevShared=0, bestShared=0, totCh=0;
  for(let i=1;i<lines.length;i++){
    const cur=lines[i]; totCh+=cur.length;
    let p=0; const pv=lines[i-1];
    while(p<cur.length&&p<pv.length&&cur[p]===pv[p])p++;
    prevShared+=p;
    let b=0;
    for(let j=Math.max(0,i-40);j<i;j++){ const q=lines[j]; let k=0;
      while(k<cur.length&&k<q.length&&cur[k]===q[k])k++; if(k>b)b=k; }
    bestShared+=b;
  }
  // token cost of the suffixes we'd actually write
  const baseTok=countTokens(t,enc);
  // simulate: write line0 fully; each subsequent line = marker + suffix
  let sim='';
  for(let i=0;i<lines.length;i++){
    if(i===0){ sim+=lines[i]+'\n'; continue; }
    let b=0,best='';
    for(let j=Math.max(0,i-40);j<i;j++){ const q=lines[j]; let k=0;
      while(k<lines[i].length&&k<q.length&&lines[i][k]===q[k])k++; if(k>b){b=k;best=q;} }
    if(b>=4) sim+='~'+lines[i].slice(b)+'\n'; else sim+=lines[i]+'\n';
  }
  const simTok=countTokens(sim,enc);
  console.log(f.split('/').pop()!.padEnd(26),'lines',String(lines.length).padStart(4),
    '| sharedWithPrev',String(prevShared).padStart(6),'sharedBest',String(bestShared).padStart(6),
    'of',String(totCh).padStart(6),'ch',
    '| baseTok',String(baseTok).padStart(5),'simTok',String(simTok).padStart(5),
    'delta',String(simTok-baseTok).padStart(5));
}
