import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const files = ['bench/holdout-work/kb-article.txt','bench/holdout-work/llm-answer.md','bench/holdout-work/email-thread.txt','bench/holdout/readme.txt','bench/holdout-lang/de-kb.txt','bench/z46/corpus/traces/spring-projects_spring-framework_35118.md'];
const marks = ['.', ',', ';', ':', '!', '?'];
// precondition check + per-mark delta
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const base = countTokens(t, 'o200k_base');
  // strict precondition: every occurrence of the mark is followed by exactly one space
  const ok: string[] = [];
  const deltas: string[] = [];
  for (const m of marks) {
    const re = new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const n = (t.match(re) || []).length;
    const reSp = new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' ', 'g');
    const nSp = (t.match(reSp) || []).length;
    const holds = n > 0 && n === nSp;
    ok.push(`${m}:${holds ? 'OK' : 'no'}(${n})`);
    if (n > 0) {
      const stripped = t.replace(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' ', 'g'), m);
      deltas.push(`${m}=${countTokens(stripped, 'o200k_base') - base}`);
    }
  }
  console.log(`${f.split('/').pop()!.padEnd(22)} base=${String(base).padStart(4)}  precond[${ok.join(' ')}]  deltas[${deltas.join(' ')}]`);
}
