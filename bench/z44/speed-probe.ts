// Z44 speed probe: where does the DAEDALUS family spend its wall clock, and what does a
// cheaper configuration cost in tokens? All runs OMEGA_DET=1 (clock frozen => arms run fully).
import fs from 'node:fs';
import { ariadneEncode } from '@/lib/omega/ariadne';
import { sibylEncode } from '@/lib/omega/sibyl';
import { veritasCEncode } from '@/lib/omega/veritas-c';
import { countTokens } from '@/lib/omega/bpe';

const files = (process.env.FILES ?? '').split(',').filter(Boolean);
const CFGS: Array<[string, () => any]> = [];
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const raw = countTokens(text, 'o200k_base');
  console.log(`\n== ${f} raw=${raw}`);
  const t = async (name: string, fn: () => any) => {
    const t0 = process.hrtime.bigint();
    let m: number | null = null, mode = '?';
    try { const r = fn(); m = r.messageTokens ?? r.outTokens; mode = r.mode ?? '?'; } catch (e) { m = null; mode = 'ERR'; }
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    console.log(`   ${name.padEnd(24)} mode=${String(mode).padEnd(9)} M=${String(m).padStart(6)}  ${ms.toFixed(0)}ms`);
  };
  await t('ariadne default', () => ariadneEncode(text, 'o200k_base', { maxSpan: 24, levels: 6, topK: 8000 }));
  await t('ariadne levels1', () => ariadneEncode(text, 'o200k_base', { maxSpan: 24, levels: 1, topK: 8000 }));
  await t('ariadne span12 L2', () => ariadneEncode(text, 'o200k_base', { maxSpan: 12, levels: 2, topK: 8000 }));
  await t('ariadne topK500 L1', () => ariadneEncode(text, 'o200k_base', { maxSpan: 12, levels: 1, topK: 500 }));
  await t('sibyl span12+words', () => sibylEncode(text, 'o200k_base', { maxSpan: 12, levels: 6, topK: 8000, wordGrid: [24] }));
  await t('sibyl L1+words', () => sibylEncode(text, 'o200k_base', { maxSpan: 12, levels: 1, topK: 2000, wordGrid: [24] }));
  await t('veritas-c', () => veritasCEncode(text, 'o200k_base'));
}
