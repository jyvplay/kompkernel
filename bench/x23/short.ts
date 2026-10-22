import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { stoichosFold, stoichosUnfold, type StoichosConfig } from '@/lib/omega/stoichos';
const enc='o200k_base' as any; const T=(s:string)=>countTokens(s,enc);
const V=[
 'Finally, after a line-initial run of # * + - > insert one space unless a space or a line break already follows.',
 'Finally, after line-initial # * + - > add a space unless one is already there.',
 'Finally, a line-leading # * + - > is followed by one space unless one already is.',
 'Finally, after # * + - > starting a line, add a space unless one follows.',
];
console.log('--- clause costs ---');
for(const v of V) console.log(String(T(v)).padStart(3), v);
const LINE: StoichosConfig={marks:[],lineMarks:true,listNum:false};
const files=['bench/holdout-work/email-thread.txt','bench/holdout-work/llm-answer.md','bench/holdout/readme.txt','bench/z47/corpus/changelog/svenstaro_miniserve.md','bench/holdout-work/kb-article.txt','bench/holdout-work/meeting-transcript.txt'];
console.log('\n--- structural (line-marks only) fold, order out, on the POLYTROPOS wire ---');
import { polytroposEncode } from '@/lib/omega/polytropos';
const cut=(r:any)=>{const dp:string=r.decoderPrompt;return {wire:String(r.wire),contract:dp.slice(String(r.wire).length+1)};};
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const p:any=polytroposEncode(t,enc); const pc=cut(p);
  const base=T(pc.wire+'\n'+pc.contract);
  for(const v of V){
    const fo=stoichosFold(pc.wire,LINE);
    const back=stoichosUnfold(fo.text,LINE,fo.stats.sentinel,fo.stats.markSentinels);
    // contract order: head clause first (unfold before parent expansion)
    const M=T(fo.text+'\n'+v+' '+pc.contract);
    console.log(`  ${f.split('/').pop()!.padEnd(24)} folds=${String(fo.stats.folds).padStart(3)} dang=${String(fo.stats.dangers).padStart(2)} rt=${back===t?'ok':'BAD'} clause=${String(T(v)).padStart(2)} ΔM=${String(M-base).padStart(4)}`);
    break; // first variant only for the sweep; variants differ only in clause cost
  }
}
