import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { daedalusEncode } from '@/lib/omega/daedalus';
const files = ['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-lang/de-kb.txt','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-work/bibliography.txt'];
const T = (s:string)=>countTokens(s,'o200k_base' as any);
for (const f of files) {
  const t = fs.readFileSync(f,'utf8');
  const d:any = daedalusEncode(t,'o200k_base' as any);
  const dp:string = d.decoderPrompt; const nl = dp.indexOf('\n');
  const contract = dp.slice(nl+1);
  // reversible junction transforms, counted WITHOUT tokenizing (pure char counts -> token delta later)
  const ps = (t.match(/\. (?! )/g)||[]).length;      // ". X" -> ".X"
  const cs = (t.match(/, (?! )/g)||[]).length;       // ", X" -> ",X"
  const semis = (t.match(/; (?! )/g)||[]).length;
  const cols = (t.match(/: (?! )/g)||[]).length;
  // conflict counts (must escape)
  const pdanger = (t.match(/\.(?=[A-Za-z])/g)||[]).length;
  const cdanger = (t.match(/,(?=[A-Za-z])/g)||[]).length;
  // token deltas for the full reversible versions
  const doPs = t.replace(/\. (?! )/g,'.').replace(/\.(?=[A-Za-z])/g,'\.·');
  const x1 = t.replace(/\. (?! )/g,'.');
  const x2 = x1.replace(/, (?! )/g,',');
  const x3 = x2.replace(/; (?! )/g,';').replace(/: (?! )/g,':');
  console.log(`${f.split('/').pop()!.padEnd(22)} raw=${String(d.inTokens).padStart(4)} M=${String(d.messageTokens).padStart(4)} | psp=${String(ps).padStart(3)} csp=${String(cs).padStart(3)} semi=${semis} col=${cols} | pdanger=${pdanger} cdanger=${cdanger} | dTok(-ps)=${T(x1)-T(t)} dTok(-ps-cs)=${T(x2)-T(t)} dTok(all)=${T(x3)-T(t)}`);
}
console.log('\n=== contract text (kb-article) ===');
const t = fs.readFileSync(files[0]!,'utf8');
const d:any = daedalusEncode(t,'o200k_base' as any);
console.log(JSON.stringify((d.decoderPrompt as string).slice((d.decoderPrompt as string).indexOf('\n')+1)));
console.log('contract tokens:', d.contractTokens);
