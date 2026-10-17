import { stoichosFold, stoichosUnfold, type StoichosConfig } from '@/lib/omega/stoichos';
const cfg: StoichosConfig = { marks: [], lineMarks: true, listNum: true };
const cases = [
  'Hello. World, and; so: on.\n',
  '- item one\n- item two\n## Head\n',
  '1. first\n2. second\n',
  '#include <stdio.h>\n-5 is neg\n',
  'a~b ~normal~ and .~x\n',
  'References\n\n[1] Bentley, J. L., & McIlroy, M. D. (1993). Eng. v3.14 done.\n',
  'no markers at all here\n',
];
let bad=0;
for (const t of cases) {
  const f = stoichosFold(t, cfg);
  const back = stoichosUnfold(f.text, cfg, f.stats.sentinel, f.stats.markSentinels);
  const ok = back===t; if(!ok) bad++;
  console.log(`folds=${String(f.stats.folds).padStart(2)} dang=${String(f.stats.dangers).padStart(2)} sent=${f.stats.sentinel??'-'} RT=${ok}`);
  if(!ok) console.log('   in :',JSON.stringify(t),'\n   w  :',JSON.stringify(f.text),'\n   out:',JSON.stringify(back));
}
console.log(bad===0?'ALL PASS':`${bad} FAIL`);
