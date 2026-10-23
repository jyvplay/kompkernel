import { readFileSync } from 'node:fs';
import { systoleFind, systoleChoose, systoleApply, systoleUndo, systoleRuns } from '@/lib/omega/systole';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const t = readFileSync(p, 'utf8');
  const ch = systoleChoose(t, enc);
  if (!ch.length) continue;
  const app = systoleApply(t, ch);
  const und = systoleUndo(app, ch);
  if (und === t) { console.log(p.split('/').pop(), 'OK'); continue; }
  let i = 0; while (i < und.length && i < t.length && und[i] === t[i]) i++;
  console.log('\n### ' + p.split('/').pop() + '  templates ' + ch.map(x=>x.digits+':'+x.shape).join(' '));
  console.log('  first diff at', i);
  console.log('  src  ', JSON.stringify(t.slice(Math.max(0,i-60), i+60)));
  console.log('  und  ', JSON.stringify(und.slice(Math.max(0,i-60), i+60)));
  // show runs near the diff
  const near = systoleRuns(t).filter(r => r.at > i-120 && r.at < i+120).slice(0, 8);
  console.log('  runs near:', near.map(r => `${r.at}+${r.len} ${r.s} -> ${[...r.s].filter(c=>!/[.:;-]/.test(c)).join('')}`).join('  |  '));
}
