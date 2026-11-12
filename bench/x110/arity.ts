/**
 * X110 — WHY DOES APOGRAPHE'S COLUMN LIFT NEVER FIRE?
 * Hypothesis: APOGRAPHE requires ONE stable arity for the WHOLE file, and every
 * real ops listing has a `# source:` comment line and/or a `total N` line whose
 * field count differs from the data rows, so the lift is killed for the file.
 * Measure: the longest CONTIGUOUS run of equal field count, per separator.
 */
import * as fs from 'node:fs';
const lanes=fs.readFileSync(process.argv[2]!,'utf8').split('\n').filter(Boolean);
const SEPS=[' ','\t',',',';','|'];
function bestRun(lines:string[],sep:string):{len:number;at:number;n:number}{
  let best={len:0,at:0,n:0},cur=null,start=0;
  for(let i=0;i<lines.length;i++){
    const n=lines[i]===''?0:lines[i]!.split(sep).length;
    if(cur===null||n!==cur){ if(cur!==null&&i-start>best.len) best={len:i-start,at:start,n:cur}; cur=n; start=i; }
  }
  if(cur!==null&&lines.length-start>best.len) best={len:lines.length-start,at:start,n:cur};
  return best;
}
console.log('lane                     lines  bestSep  runLen  at  arity  fileArityStable');
for(const p of lanes){
  const lines=fs.readFileSync(p,'utf8').split('\n');
  if(lines.length&&lines[lines.length-1]==='') lines.pop();
  let best={sep:' ',len:0,at:0,n:0};
  for(const s of SEPS){ const r=bestRun(lines,s); if(r.n>=2 && r.len*r.n > best.len*best.n) best={sep:s===' '?'SP':s==='\t'?'TAB':s,len:r.len,at:r.at,n:r.n}; }
  const whole=bestRun(lines,best.sep==='SP'?' ':best.sep==='TAB'?'\t':best.sep);
  // how many lines match the dominant arity?
  let match=0; for(const l of lines) if(l.split(best.sep==='SP'?' ':best.sep==='TAB'?'\t':best.sep).length===best.n) match++;
  console.log(`${p.split('/').pop()!.padEnd(22)} ${String(lines.length).padStart(5)}  ${best.sep.padStart(6)} ${String(best.len).padStart(7)} ${String(best.at).padStart(3)} ${String(best.n).padStart(6)}  match ${String(match).padStart(4)}/${String(lines.length).padStart(4)}  runAt0=${best.at===0?'y':'N'}`);
}
