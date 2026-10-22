import fs from 'node:fs';
import { stoichosFold, stoichosUnfold, type StoichosConfig } from '@/lib/omega/stoichos';
const cfg: StoichosConfig = { marks: ['.', ',', ';', ':'], lineMarks: true, listNum: true };
const cases = [
  'Hello. World, and; so: on.',
  'References\n\n[1] Bentley, J. L., & McIlroy, M. D. (1993). Eng. v3.14 done.\n',
  '- item one\n- item two\n## Head\n',
  '1. first\n2. second\n',
  '#include <stdio.h>\n-5 is neg\n',
  'a~b ~normal~ and .~x\n',
];
for (const t of cases) {
  const f = stoichosFold(t, cfg);
  const back = stoichosUnfold(f.text, cfg, f.stats.sentinel, f.stats.markSentinels);
  console.log(`folds=${String(f.stats.folds).padStart(2)} dang=${String(f.stats.dangers).padStart(2)} sent=${f.stats.sentinel??'-'} ms=${JSON.stringify(f.stats.markSentinels)} RT=${back===t}`);
  if (back !== t) console.log('   in :', JSON.stringify(t), '\n   w  :', JSON.stringify(f.text), '\n   out:', JSON.stringify(back));
}
console.log('--- bibliography ---');
const t = fs.readFileSync('bench/holdout-work/bibliography.txt','utf8');
const f = stoichosFold(t, cfg);
const back = stoichosUnfold(f.text, cfg, f.stats.sentinel, f.stats.markSentinels);
console.log(`folds=${f.stats.folds} dang=${f.stats.dangers} RT=${back===t} sent=${f.stats.sentinel} ms=${JSON.stringify(f.stats.markSentinels)}`);
if (back!==t) { let k=0; while(k<Math.min(back.length,t.length)&&back[k]===t[k])k++;
  console.log('  diff at',k,'\n   got :',JSON.stringify(back.slice(Math.max(0,k-50),k+50)),'\n   want:',JSON.stringify(t.slice(Math.max(0,k-50),k+50))); }
