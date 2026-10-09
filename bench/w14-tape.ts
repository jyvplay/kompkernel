import fs from 'node:fs';
import { countTokens, type EncodingName } from '../src/lib/omega/bpe';
import { ariadneEncode } from '../src/lib/omega/ariadne';
import { sibylEncode } from '../src/lib/omega/sibyl';
const ENC: EncodingName='o200k_base'; const T=(s:string)=>countTokens(s,ENC);
for (const f of ['bench/holdout-work/kb-article.txt','bench/holdout/gh-prose.txt','bench/holdout-work/llm-answer.md']) {
  const t=fs.readFileSync(f,'utf8');
  for (const [nm,fn] of [['ariadne',ariadneEncode],['sibyl',sibylEncode]] as any[]) {
    let r; try { r=fn(t,ENC,{budgetMs:4000}); } catch(e){ console.log(f,nm,'ERR',String(e).slice(0,80)); continue; }
    const bi=r.wire.indexOf('¶');
    const tape=bi>=0?r.wire.slice(0,bi+1):'';
    console.log(`\n--- ${f}  [${nm}] raw=${T(t)} wire=${r.outTokens} msg=${r.messageTokens} mode=${r.mode} rules=${r.phraseRules??r.rules} tapeTok=${T(tape)}`);
    console.log('TAPE:', JSON.stringify(tape.slice(0,700)));
  }
  // what would the top token-pair merges be worth?
  const words = t.match(/[^\s]+|\s+/g) ?? [];
  const pairFreq = new Map<string, number>();
  const toks = (await import('../src/lib/omega/bpe')).tokenStrings(t, ENC);
  for (let i=0;i+1<toks.length;i++){ const p=toks[i]+toks[i+1]; pairFreq.set(p,(pairFreq.get(p)??0)+1); }
  const top=[...pairFreq.entries()].filter(([p,c])=>c>=3 && !/\n/.test(p)).sort((a,b)=>b[1]-a[1]).slice(0,14);
  console.log('TOP TOKEN-PAIRS:', top.map(([p,c])=>`${JSON.stringify(p)}x${c}`).join(' '));
  let potential=0; for (const [p,c] of pairFreq) { if (c<3 || /\n/.test(p)) continue; const g=c*(T(p)-0.7)-T(p)-1; if (g>0) potential+=g; }
  console.log('naive pair-merge potential (independent, overlapping):', Math.round(potential), 'of', T(t));
}
