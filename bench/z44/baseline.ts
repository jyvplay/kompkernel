// Z44 baseline: DAEDALUS (frontier) + KALLIGRAPHOS + identity on the shared corpus.
// Run with OMEGA_DET=1 so the wall-clock gates in the DAEDALUS arm search are frozen.
// FILES=<list> OUT=<jsonl>
import fs from 'node:fs';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { kalligraphosEncode } from '@/lib/omega/kalligraphos';
import { anamnesisEncode } from '@/lib/omega/anamnesis';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';

const files = fs.readFileSync(process.env.FILES!, 'utf8').split('\n').filter(Boolean);
const encs = (process.env.ENCS ?? 'o200k_base').split(',') as EncodingName[];
const OUT = process.env.OUT!;

function main() {
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const enc of encs) {
      const inTokens = countTokens(text, enc);
      const row: any = { file: f, enc, chars: text.length, inTokens };
      for (const [key, fn] of [
        ['daedalus', daedalusEncode],
        ['kalligraphos', kalligraphosEncode],
        ['anamnesis', (t: string, e: any) => anamnesisEncode(t, e, { gate: false })],
      ] as const) {
        const t0 = Date.now();
        try {
          const r = fn(text, enc) as any;
          row[key] = r.messageTokens;
          row[key + 'Exact'] = r.decoded === text;
          row[key + 'Mode'] = r.mode;
          row[key + 'Ms'] = Date.now() - t0;
        } catch (e) {
          row[key] = null; row[key + 'Err'] = (e as Error).message;
        }
      }
      fs.appendFileSync(OUT, JSON.stringify(row) + '\n');
      console.error(`${f.split('/').slice(-2).join('/')} in=${inTokens} dae=${row.daedalus} kall=${row.kalligraphos} ana=${row.anamnesis} exact=${row.daedalusExact}/${row.kalligraphosExact}/${row.anamnesisExact} ${row.daedalusMs}ms/${row.anamnesisMs}ms`);
    }
  }
  console.error('done');
}
main();
