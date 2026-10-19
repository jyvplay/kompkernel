import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const enc='o200k_base' as any;

/** Greedy dictionary coder: what is the CEILING for exact-substring rules? */
function ceiling(text: string, maxRules: number, minLen=2) {
  let body = text;
  let wire = countTokens(body, enc);
  const rules: Array<[string,string]> = [];
  const used = new Set([...text]);
  const glyphs: string[] = [];
  for (const [lo,hi] of [[0x400,0x500],[0x370,0x3e0]] as Array<[number,number]>)
    for (let cp=lo; cp<hi; cp++){ const ch=String.fromCodePoint(cp);
      if(!used.has(ch) && countTokens(ch,enc)===1) glyphs.push(ch); }
  let gi = 0;
  const trace: string[] = [];
  const raw = countTokens(text, enc);
  while (rules.length < maxRules && gi < glyphs.length) {
    // count occurrences of every candidate substring, cost-weighted
    const freq = new Map<string,number>();
    for (let a=0;a<body.length;a++)
      for (let b=a+minLen;b<=Math.min(a+40,body.length);b++){
        const s=body.slice(a,b); if(!s.trim()) continue; freq.set(s,(freq.get(s)||0)+1);
      }
    let bestS='', bestGain=0;
    for (const [s,n] of freq){ if(n<2) continue;
      const gain = n*(countTokens(s,enc)-1);
      if (gain>bestGain){ bestGain=gain; bestS=s; } }
    if (!bestS || bestGain<=0) break;
    const g = glyphs[gi++];
    body = body.split(bestS).join(g);
    rules.push([g,bestS]);
    wire = countTokens(body, enc);
    trace.push(`${String(rules.length).padStart(2)} rules: wire ${String(wire).padStart(4)}  saved ${String(raw-wire).padStart(3)}  est.contract ${3+4*rules.length}  net ${wire+3+4*rules.length}`);
  }
  return { raw, wire, rules: rules.length, saved: raw-wire, trace, body };
}

const files = (process.env.F||'prose-01').split(',');
const lens  = (process.env.L||'250,500,1000,2000').split(',').map(Number);
for (const f of files){
  const full = fs.readFileSync(`bench/x30/fresh/${f}.txt`,'utf8');
  for (const L of lens){
    const t = full.slice(0,L);
    const raw = countTokens(t,enc);
    const c = ceiling(t, 60);
    console.log(`\n### ${f} @ ${L} chars, raw ${raw} tok`);
    console.log(`   CEILING: ${c.rules} rules, wire ${c.wire}, saved ${c.saved} (${(100*c.saved/raw).toFixed(1)}%)`);
    for (const line of c.trace.filter((_,i)=>[0,2,4,9,19,29,49].includes(i))) console.log('     '+line);
  }
}
