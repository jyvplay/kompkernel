import fs from 'node:fs'; import path from 'node:path';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
const ENC:EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
// o200k_base pre-tokenizer
const PAT=/'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
function chunks(s:string):string[]{ return s.match(PAT) ?? []; }
const memo=new Map<string,number>();
function Tc(c:string){ const h=memo.get(c); if(h!==undefined) return h; const v=T(c); memo.set(c,v); return v; }
function Tlocal(s:string){ let n=0; for(const c of chunks(s)) n+=Tc(c); return n; }

const files:Array<[string,string]>=[];
for(const d of ['bench/holdout','bench/holdout-work','bench/holdout-lang','bench/holdout-tbl','bench/holdout-ops','bench/holdout-tab'])
  if(fs.existsSync(d)) for(const f of fs.readdirSync(d).sort()){const t=fs.readFileSync(path.join(d,f),'utf8'); if(t.length<60000) files.push([d.split('/').pop()!+'/'+f,t]);}

console.log('=== 1. EXACTNESS: does sum of per-chunk tokens equal whole-string tokens? ===');
let bad=0;
for(const [n,t] of files){
  // reconstruction check first
  const cs=chunks(t);
  if(cs.join('')!==t){ console.log('  CHUNK RECONSTRUCTION FAIL', n); bad++; continue; }
  const a=T(t), b=Tlocal(t);
  if(a!==b){ console.log(`  MISMATCH ${n}: whole=${a} chunked=${b} delta=${b-a}`); bad++; }
}
console.log(`${files.length-bad}/${files.length} documents: chunk decomposition is EXACT`);

console.log('\n=== 2. SPEED: whole-string tokenizer vs memoised chunk sum ===');
for(const [n,t] of files.slice(0,8)){
  const N=40;
  let t0=Date.now(); for(let i=0;i<N;i++) T(t); const msWhole=(Date.now()-t0)/N;
  memo.clear(); Tlocal(t);                      // warm
  t0=Date.now(); for(let i=0;i<N;i++) Tlocal(t); const msLocal=(Date.now()-t0)/N;
  console.log(n.padEnd(28), 'chars',String(t.length).padStart(6),
    'whole',msWhole.toFixed(3).padStart(8)+'ms','local',msLocal.toFixed(3).padStart(8)+'ms',
    'speedup',(msWhole/Math.max(msLocal,1e-6)).toFixed(1).padStart(7)+'x');
}

console.log('\n=== 3. chunk reuse: how memoisable is a document? ===');
for(const [n,t] of files.slice(0,8)){
  const cs=chunks(t); const d=new Set(cs);
  console.log(n.padEnd(28),'chunks',String(cs.length).padStart(6),'distinct',String(d.size).padStart(6),'reuse',(cs.length/d.size).toFixed(2)+'x');
}

console.log('\n=== 4. WINDOWED DELTA: can a replacement be scored without touching the whole doc? ===');
// Replace every occurrence of `s` with glyph g; compare exact whole-doc delta
// to a delta computed only from the chunks the edit touches.
function windowDelta(body:string, s:string, g:string){
  let delta=0, i=0;
  for(;;){
    const j=body.indexOf(s,i); if(j<0) break;
    // widen to chunk boundaries using a bounded window
    const lo=Math.max(0, j-80), hi=Math.min(body.length, j+s.length+80);
    const pre=body.slice(lo,j), post=body.slice(j+s.length,hi);
    const before=Tlocal(pre+s+post), after=Tlocal(pre+g+post);
    delta += before-after;
    i=j+s.length;
  }
  return delta;
}
const t=fs.readFileSync('bench/holdout/gh-prose.txt','utf8');
const g='\u04d9';
const tests=[' the',' and','https://github.com','\r\n   ',' `','. ','Reviewed-by'];
console.log('substring'.padEnd(22),'occ'.padStart(4),'trueDelta'.padStart(10),'windowDelta'.padStart(12),'agree');
for(const s of tests){
  const occ=t.split(s).length-1; if(!occ) continue;
  const trueD=T(t)-T(t.split(s).join(g));
  const winD=windowDelta(t,s,g);
  console.log(JSON.stringify(s).padEnd(22),String(occ).padStart(4),String(trueD).padStart(10),String(winD).padStart(12),(trueD===winD)?'YES':'no');
}
