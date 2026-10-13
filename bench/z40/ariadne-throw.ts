// Z40: surface exceptions that DAEDALUS's runArm swallows (catch { r = null }).
import fs from 'node:fs';
import { ariadneEncode } from '@/lib/omega/ariadne';
import { sibylEncode } from '@/lib/omega/sibyl';
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
for (const [name, fn] of [
  ['ariadne-span12+words', () => ariadneEncode(text, 'o200k_base', { maxSpan: 12, levels: 6, topK: 8000, noBlocks: false })],
  ['ariadne-default', () => ariadneEncode(text, 'o200k_base', { maxSpan: 24, levels: 6, topK: 8000, noBlocks: false })],
  ['sibyl-words', () => sibylEncode(text, 'o200k_base', { maxSpan: 12, levels: 6, topK: 8000, noBlocks: false, wordGrid: [1] } as any)],
] as const) {
  try {
    const r: any = (fn as any)();
    console.log(name, 'ok', r ? { mode: r.mode, M: r.messageTokens, out: r.outTokens, exact: r.decoded === text } : null);
  } catch (e: any) {
    console.log(name, 'THREW', String(e && e.message || e).slice(0, 300), (e && e.stack || '').split('\n').slice(1, 4).join(' | ').slice(0, 400));
  }
}
