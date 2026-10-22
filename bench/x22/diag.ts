import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lexisFold, lexisUnfold } from '@/lib/omega/lexis';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc='o200k_base' as any;
for (const f of ['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/email-thread.txt']) {
  const t=fs.readFileSync(f,'utf8');
  const raw=countTokens(t,enc);
  const g=lexisFold(t);
  const rt=lexisUnfold(g.text,g.stats.sentinels);
  const pRaw:any=polytroposEncode(t,enc);
  const pFold:any=polytroposEncode(g.text,enc);
  console.log(`${f.split('/').pop()!.padEnd(20)} raw=${raw} folds=${g.stats.folds} dang=${g.stats.dangers} foldTok=${countTokens(g.text,enc)} (d=${countTokens(g.text,enc)-raw}) RT=${rt===t} | polyRaw=${pRaw.messageTokens} polyFold=${pFold.messageTokens} (d=${pFold.messageTokens-pRaw.messageTokens}) rulesRaw=${pRaw.winner} rulesFold=${pFold.winner}`);
}
