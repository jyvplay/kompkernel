// Z44 probe 2: what does ARIADNE actually find on the non-Latin lanes?
import fs from 'node:fs';
import { ariadneEncode } from '@/lib/omega/ariadne';
import { sibylEncode } from '@/lib/omega/sibyl';
import { countTokens } from '@/lib/omega/bpe';

const files = (process.env.FILES ?? '').split(',').filter(Boolean);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const inT = countTokens(text, 'o200k_base');
  const r: any = ariadneEncode(text, 'o200k_base', { maxSpan: 12, levels: 6, topK: 8000 });
  const s: any = sibylEncode(text, 'o200k_base', { maxSpan: 12, levels: 6, topK: 8000, wordGrid: [24] });
  console.log(`\n== ${f} in=${inT}`);
  console.log(`   ariadne mode=${r.mode} M=${r.messageTokens} wire=${r.outTokens} est=${r.estimate} rules=${r.phraseRules} asgGain=${r.assignmentGain} searchGain=${r.searchGain}`);
  console.log(`     notes: ${r.notes.slice(0, 300)}`);
  console.log(`   sibyl   mode=${s.mode} M=${s.messageTokens} wire=${s.outTokens} rules=${s.phraseRules ?? s.rules} wordRules=${s.wordRules ?? '?'} asgGain=${s.assignmentGain}`);
  console.log(`     notes: ${s.notes.slice(0, 300)}`);
}
