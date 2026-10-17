import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const files = ['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-lang/de-kb.txt','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt'];
const xforms: [string, (s:string)=>string][] = [
  ['identity', s=>s],
  ['noSpaces', s=>s.replace(/ /g,'')],
  ['noSpaceAfterPunct', s=>s.replace(/([.,;:!?]) /g,'$1')],
  ['lower', s=>s.toLowerCase()],
  ['noPeriod', s=>s.replace(/\.(?= )/g,'')],
  ['noComma', s=>s.replace(/,/g,'')],
  ['noApostrophe', s=>s.replace(/'/g,'')],
  ['collapseWS', s=>s.replace(/[ \t]+/g,' ')],
  ['noArticles', s=>s.replace(/\b(a|an|the) /g,'')],
  ['stripMarkup', s=>s.replace(/<[^>]*>/g,'')],
  ['mdPlain', s=>s.replace(/\[([^\]]*)\]\([^)]*\)/g,'$1')],
  ['noQuoteMarks', s=>s.replace(/"/g,'')],
];
for (const f of files) {
  const t = fs.readFileSync(f,'utf8');
  const base = countTokens(t,'o200k_base');
  const out = xforms.map(([n,fn])=>`${n}=${countTokens(fn(t),'o200k_base')-base}`).join('  ');
  console.log(`${f.split('/').pop()!.padEnd(20)} base=${String(base).padStart(4)}  deltas: ${out}`);
}
