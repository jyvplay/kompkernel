// Z40: replicate DAEDALUS runArm exactly (no catch) to surface the swallowed exception.
import fs from 'node:fs';
import { ariadneEncode } from '@/lib/omega/ariadne';
import { sibylEncode } from '@/lib/omega/sibyl';
const text = fs.readFileSync(process.argv[2], 'utf8');
const specs: [string, any][] = [
  ['span12', { maxSpan: 12, levels: 6, topK: 8000, words: 0 }],
  ['span12+words', { maxSpan: 12, levels: 6, topK: 8000, words: 1 }],
  ['default', { maxSpan: 24, levels: 6, topK: 8000, words: 0 }],
];
for (const [tag, arm] of specs) {
  const shared = { maxSpan: arm.maxSpan, levels: arm.levels, topK: arm.topK, noBlocks: false, sep: undefined };
  try {
    const r: any = arm.words > 0 ? sibylEncode(text, 'o200k_base', { ...shared, wordGrid: [arm.words] } as any) : ariadneEncode(text, 'o200k_base', shared as any);
    console.log(tag, 'returned', r ? r.mode : null, r ? r.messageTokens : null);
  } catch (e: any) {
    console.log(tag, 'THREW', String(e && e.message || e).slice(0, 400));
    console.log((e && e.stack || '').split('\n').slice(0, 4).join('\n'));
  }
}
