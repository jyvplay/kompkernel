import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lexisFold, lexisUnfold } from '@/lib/omega/lexis';
import { polytroposEncode } from '@/lib/omega/polytropos';
const enc='o200k_base' as any;
const LEX=19; // tokens of the lex clause (measured)
const files=['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-work/bibliography.txt','bench/holdout-lang/de-kb.txt','bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/holdout-ops/git-numstat.txt','bench/holdout-tbl/psql-output.txt'];
console.log('lane                    raw  polyM  wire contract  tape | fold(wire): folds dang dTok  Mout  | fold(tape): folds dTok | fold(body): folds dTok');
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const raw=countTokens(t,enc);
  const p:any=polytroposEncode(t,enc);
  const dp:string=p.decoderPrompt; const contract=dp.slice(String(p.wire).length+1);
  const wire:string=p.wire;
  const pi=wire.indexOf('¶'); const tape=pi>=0?wire.slice(0,pi):''; const body=pi>=0?wire.slice(pi+1):'';
  const contractTok=countTokens(contract,enc);
  // fold the whole wire (order 'out')
  const fw=lexisFold(wire);
  const Mout=countTokens(fw.text+'\n'+contract,enc)+LEX;
  // fold tape only
  const ft=lexisFold(tape);
  // fold body only
  const fb=lexisFold(body);
  console.log(`${f.split('/').pop()!.padEnd(23)}${String(raw).padStart(4)} ${String(p.messageTokens).padStart(6)} ${String(countTokens(wire,enc)).padStart(5)} ${String(contractTok).padStart(8)} ${String(tape.length).padStart(5)} | ${String(fw.stats.folds).padStart(11)} ${String(fw.stats.dangers).padStart(4)} ${String(countTokens(fw.text,enc)-countTokens(wire,enc)).padStart(5)} ${String(Mout-p.messageTokens).padStart(5)}  | ${String(ft.stats.folds).padStart(10)} ${String(countTokens(ft.text,enc)-countTokens(tape,enc)).padStart(5)} | ${String(fb.stats.folds).padStart(11)} ${String(countTokens(fb.text,enc)-countTokens(body,enc)).padStart(5)}`);
}
