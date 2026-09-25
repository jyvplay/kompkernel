/** bench/frontier.ts — fast focused frontier measurement: who is actually best per lane? */
import fs from 'node:fs';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';
import { proteusEncode } from '@/lib/omega/proteus';
import { logosEncode } from '@/lib/omega/logos';
import { mosaicEncode } from '@/lib/omega/mosaic';
import { cadmusEncode } from '@/lib/omega/cadmus';
import { hermesEncode } from '@/lib/omega/hermes';
import { CHAOS_900, CHAOS_G_CJK, CHAOS_F_LLM_REPORT, MOSAIC_HANDTRACE_300, mosaicFixtures } from './fixtures';

async function main() {
  const enc = (process.argv[2] as EncodingName) || 'o200k_base';
  const f = mosaicFixtures();
  const lanes: Array<[string, string]> = [
    ...fs.readdirSync('bench/holdout').sort().map(nm => ['holdout/' + nm, fs.readFileSync('bench/holdout/' + nm, 'utf8')] as [string, string]),
    ['CHAOS_900', CHAOS_900],
    ['CHAOS_G_CJK', CHAOS_G_CJK],
    ['CHAOS_F_LLM_REPORT', CHAOS_F_LLM_REPORT],
    ['MOSAIC_HANDTRACE_300', MOSAIC_HANDTRACE_300],
    ['json-log-40', f.jsonLog],
    ['csv-60', f.csv],
    ['chat-48', f.chat],
    ['grid-30', f.grid],
    ['rle-1400', f.rle],
    ['idrun-200', f.idrun],
    ['prose', f.prose],
    ['agent-turn', f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat],
    ['two-regime', f.jsonLog + '\n' + f.rle],
    ['three-regime', f.csv + '\n' + f.grid + '\n' + f.rle],
  ];
  const codecs: Array<[string, (t: string, e: EncodingName) => Promise<{ wire: string; decoded: string | null; outTokens?: number }> | { wire: string; decoded: string | null; outTokens?: number }]> = [
    ['PROTEUS', (t, e) => proteusEncode(t, e)],
    ['LOGOS', (t, e) => logosEncode(t, e)],
    ['MOSAIC', (t, e) => mosaicEncode(t, e) as any],
    ['CADMUS', (t, e) => cadmusEncode(t, e) as any],
    ['HERMES', (t, e) => hermesEncode(t, e) as any],
  ];
  console.log('lane'.padEnd(28), 'in'.padStart(6), ...codecs.map(c => c[0].padStart(9)));
  const totals = new Map<string, number>(codecs.map(c => [c[0], 0]));
  const fails = new Map<string, number>(codecs.map(c => [c[0], 0]));
  const bestOf = new Map<string, { codec: string; tokens: number }>();
  for (const [lane, text] of lanes) {
    const inT = countTokens(text, enc);
    const row: string[] = [];
    for (const [name, fn] of codecs) {
      try {
        const r = await fn(text, enc);
        const ok = r.decoded === text;
        const t = ok ? (r.outTokens ?? countTokens(r.wire, enc)) : Infinity;
        if (!ok) fails.set(name, (fails.get(name) ?? 0) + 1);
        else totals.set(name, (totals.get(name) ?? 0) + t);
        const cur = bestOf.get(lane);
        if (ok && (!cur || t < cur.tokens)) bestOf.set(lane, { codec: name, tokens: t });
        row.push(ok ? String(t).padStart(9) : 'FAIL'.padStart(9));
      } catch (e: any) {
        fails.set(name, (fails.get(name) ?? 0) + 1);
        row.push('ERR'.padStart(9));
      }
    }
    console.log(lane.padEnd(28), String(inT).padStart(6), ...row);
  }
  console.log('\nTOTALS (exact lanes only):');
  for (const [k, v] of [...totals.entries()].sort((a, b) => a[1] - b[1])) console.log(k.padEnd(12), String(v).padStart(7), fails.get(k) ? `FAILS=${fails.get(k)}` : '');
  console.log('\nPer-lane best codec:');
  for (const [lane, b] of bestOf) console.log(lane.padEnd(28), b.codec, b.tokens);
}
main().catch(e => { console.error(e); process.exit(1); });
