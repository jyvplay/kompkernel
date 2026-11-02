import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const files = ['bench/holdout-work/kb-article.txt','bench/holdout-work/bibliography.txt','bench/holdout-work/email-thread.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/meeting-transcript.txt','bench/holdout/holdout/x','bench/holdout/readme.txt','bench/holdout/gh-prose.txt','bench/holdout/md-react.txt','bench/holdout/license.txt'];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const t = fs.readFileSync(f, 'utf8');
  const toks = tokenStrings(t, enc);
  const n = toks.length;
  const uniq = new Set(toks.map(x => x.s)).size;
  // top bigrams of tokens joined
  const bg = new Map<string, number>();
  for (let i = 0; i + 1 < toks.length; i++) { const k = toks[i].s + '\u0000' + toks[i+1].s; bg.set(k, (bg.get(k) ?? 0) + 1); }
  const top = [...bg.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>[k.replace('\u0000','|'),v]);
  // potential: sum over bigrams with count>=2 of (count-1)
  let gain = 0;
  for (const [,c] of bg) if (c >= 2) gain += c - 1;
  console.log(JSON.stringify({f, chars: t.length, tokens: n, uniq, uniqShare: +(uniq/n).toFixed(3), bigramPairGainCeiling: gain, top}));
}
