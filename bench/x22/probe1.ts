import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { lexisEncode, type LexisParent } from '@/lib/omega/lexis';
import { lakonikosEncode } from '@/lib/omega/lakonikos';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { chironDecode } from '@/lib/omega/chiron';
const enc = 'o200k_base' as any;
const P: LexisParent[] = [
  { name:'identity', run:(t)=>({wire:t, contract:'Print the text exactly as given.'}), undo:(w)=>w },
  { name:'lakonikos', run:(t)=>{ const r:any=lakonikosEncode(t,enc); const dp:string=r.decoderPrompt; return {wire:r.wire, contract:dp.slice(String(r.wire).length+1)}; }, undo:(w)=>JSON.parse(JSON.stringify(chironDecode(w))) },
  { name:'daedalus', run:(t)=>{ const r:any=daedalusEncode(t,enc); const dp:string=r.decoderPrompt; return {wire:r.wire, contract:dp.slice(String(r.wire).length+1)}; }, undo:(w)=>chironDecode(w) },
];
const files = ['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-lang/de-kb.txt','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-work/meeting-transcript.txt','bench/holdout-work/bibliography.txt','bench/holdout-tab/vix-daily-1990.csv','bench/holdout-tab/aapl-2014.csv','bench/holdout-tbl/psql-output.txt','bench/holdout-tbl/kubectl-get-pods.txt'];
for (const f of files) {
  const t = fs.readFileSync(f,'utf8');
  const raw = countTokens(t, enc);
  const r = lexisEncode(t, enc, P);
  console.log(`${f.split('/').pop()!.padEnd(24)} raw=${String(raw).padStart(4)} lexisM=${String(r.messageTokens).padStart(4)} Δ=${String(r.messageTokens-raw).padStart(4)} parent=${r.parent.padEnd(10)} ord=${r.order.padEnd(4)} folds=${String(r.folds).padStart(3)} dang=${String(r.dangers).padStart(3)} sent=${r.sentinels.join('')||'-'} exact=${r.exact}`);
}
