// Z44 probe: why do some lanes fall back to identity? Call the arms directly.
import fs from 'node:fs';
import { daedalusEncode, daedalusFeatures, daedalusOrder } from '@/lib/omega/daedalus';
import { ariadneEncode } from '@/lib/omega/ariadne';
import { sibylEncode } from '@/lib/omega/sibyl';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';

const files = (process.env.FILES ?? '').split(',').filter(Boolean);
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const inT = countTokens(text, 'o200k_base');
  const feat = daedalusFeatures(text, 'o200k_base');
  const order = daedalusOrder(feat);
  console.log(`\n== ${f}  in=${inT} chars=${text.length}`);
  console.log(`   features`, JSON.stringify(feat), 'order', order.join(','));
  const ARMS: any = {
    default: { maxSpan: 24, levels: 6, topK: 8000, words: 0 },
    'span12': { maxSpan: 12, levels: 6, topK: 8000, words: 0 },
    'span12+words': { maxSpan: 12, levels: 6, topK: 8000, words: 24 },
  };
  for (const tag of ['default', 'span12', 'span12+words']) {
    const a = ARMS[tag];
    const t0 = Date.now();
    try {
      const shared = { maxSpan: a.maxSpan, levels: a.levels, topK: a.topK };
      const r: any = a.words ? sibylEncode(text, 'o200k_base', { ...shared, wordGrid: [a.words] }) : ariadneEncode(text, 'o200k_base', shared);
      const ok = r.decoded === text && chironDecode(r.wire) === text;
      console.log(`   arm ${tag}: mode=${r.mode} M=${r.messageTokens} wire=${r.outTokens} rules=${r.phraseRules ?? r.rules} exact=${ok} ${Date.now() - t0}ms`);
    } catch (e) {
      console.log(`   arm ${tag}: THREW ${(e as Error).message.slice(0, 200)}`);
    }
  }
  const d = daedalusEncode(text, 'o200k_base');
  console.log(`   daedalus: mode=${d.mode} M=${d.messageTokens} arm=${d.winningArm} notes=${d.notes.slice(0, 240)}`);
}
