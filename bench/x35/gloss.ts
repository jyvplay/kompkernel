import fs from 'node:fs';
import { oikonomiaEncode } from '@/lib/omega/oikonomia';
import { countTokens } from '@/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironParseTape, chironInScript } from '@/lib/omega/chiron';
const enc='o200k_base' as any;
const SCRIPTS:any=require('@/lib/omega/chiron').CHIRON_SCRIPTS;
function scriptOf(ch:string){ const cp=ch.codePointAt(0); if(cp===undefined)return null;
  for(const s of SCRIPTS) if((chironInScript as any)(s,cp)) return s; return null; }
function lcs(a:string,b:string){ const n=a.length,m=b.length;
  if(n*m>4e6) return 0; const dp=new Uint16Array((n+1)*(m+1));
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++) dp[i*(m+1)+j]= a[i-1]===b[j-1]?dp[(i-1)*(m+1)+j-1]+1:Math.max(dp[(i-1)*(m+1)+j],dp[i*(m+1)+j-1]);
  return dp[n*(m+1)+m]; }
for(const f of (process.env.LANES||'').split(',').filter(Boolean)){
  if(!fs.existsSync(f))continue;
  const t=fs.readFileSync(f,'utf8');
  const r:any=oikonomiaEncode(t,enc);
  const w:String=r.wire; const cut=w.indexOf(CHIRON_SEP);
  if(cut<0) continue;
  const gloss=w.slice(CHIRON_START.length,cut);
  const sc=scriptOf(gloss[0]||''); const parsed=sc?((chironParseTape as any)(gloss,sc) as any[]):[];
  if(!parsed.length){ console.log(f.split('/').pop()!.padEnd(26),'no rules'); continue; }
  const ph=parsed.map(p=>p.raw);
  const gTok=countTokens(gloss,enc);
  const lens=ph.map(p=>p.length);
  // near-duplicate pairs among glossary phrases
  let pairs=0, bestSim=0, bestPair='';
  const thr=Number(process.env.THR||0.75);
  for(let i=0;i<ph.length;i++)for(let j=i+1;j<ph.length;j++){
    const a=ph[i],b=ph[j]; if(!a.length||!b.length)continue;
    const s=2*lcs(a,b)/(a.length+b.length);
    if(s>=thr){ pairs++; if(s>bestSim){bestSim=s;bestPair=a.slice(0,40)+' || '+b.slice(0,40);} }
  }
  // potential delta saving: for each pair, saving = tokens(longer) - tokens(diff)
  let deltaSave=0;
  for(let i=0;i<ph.length;i++)for(let j=0;j<ph.length;j++){
    if(i===j)continue; const a=ph[i],b=ph[j];
    if(!a.length||!b.length)continue;
    if(!(b.length>a.length+2)) continue;
    if(2*lcs(a,b)/(a.length+b.length)<thr) continue;
    const cost=countTokens(b,enc);
    const diffCost=Math.max(3,Math.abs(b.length-a.length)/3);
    deltaSave=Math.max(deltaSave,0)+Math.max(0,cost-diffCost-4);
  }
  console.log(f.split('/').pop()!.padEnd(26),'rules',String(ph.length).padStart(3),
    'glossTok',String(gTok).padStart(4),'perRule',(gTok/ph.length).toFixed(1),
    '| phraseLen med',String(lens.sort((x,y)=>x-y)[lens.length>>1]).padStart(3),
    'max',String(lens[lens.length-1]).padStart(4),
    '| nearDupPairs',String(pairs).padStart(4),'best',bestSim.toFixed(2),
    '| estDeltaSave',String(Math.round(deltaSave)).padStart(4));
  if(process.env.SHOW) console.log('    best pair:',JSON.stringify(bestPair));
}
