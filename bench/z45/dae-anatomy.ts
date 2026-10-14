import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { sibylEncode } from '@/lib/omega/sibyl';
import { countTokens, tokenStrings } from '@/lib/omega/bpe';
for (const f of process.argv.slice(2)) {
  const text = fs.readFileSync(f, 'utf8');
  const r = daedalusEncode(text, 'o200k_base');
  const sepIdx = r.wire.indexOf('¶');
  const tape = sepIdx >= 0 ? r.wire.slice(0, sepIdx + 1) : '';
  const body = sepIdx >= 0 ? r.wire.slice(sepIdx + 1) : r.wire;
  console.log(`${f.split('/').pop()} in=${r.inTokens} M=${r.messageTokens} wire=${r.outTokens} tape=${countTokens(tape,'o200k_base')} body=${countTokens(body,'o200k_base')} phraseRules=${r.phraseRules} wordRules=${r.wordRules} gain=${r.assignmentGain} arm=${r.winningArm} script=${r.script} ms=${r.ms}`);
  // word-grid sweep on sibyl
  for (const wg of [0, 24, 64, 128]) {
    try {
      const s = sibylEncode(text, 'o200k_base', { maxSpan: 12, levels: 6, topK: 8000, wordGrid: wg ? [wg] : undefined } as any);
      console.log(`   sibyl wordGrid=${wg}: M=${s.messageTokens} wire=${s.outTokens} rules=${(s as any).phraseRules ?? (s as any).rules} words=${(s as any).wordRules} gain=${(s as any).assignmentGain} mode=${s.mode}`);
    } catch (e) { console.log('   sibyl err', (e as Error).message); }
  }
}
