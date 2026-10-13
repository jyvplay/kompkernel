// Z44: measure the ANAMNESIS deterministic core against the frontier on the shared corpus.
import fs from 'node:fs';
import { anamnesisCore, anamnesisEncode } from '@/lib/omega/anamnesis';
import { daedalusEncode } from '@/lib/omega/daedalus';
import { chironDecode } from '@/lib/omega/chiron';
import { countTokens, type EncodingName } from '@/lib/omega/bpe';

const files = fs.readFileSync(process.env.FILES!, 'utf8').split('\n').filter(Boolean);
const enc = (process.env.ENC ?? 'o200k_base') as EncodingName;
const OUT = process.env.OUT!;
const withDae = process.env.DAE === '1';

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  const inTokens = countTokens(text, enc);
  const t0 = Date.now();
  const core = anamnesisCore(text, enc);
  const coreMs = Date.now() - t0;
  const coreExact = chironDecode(core.wire) === text || core.wire === text;
  let dae: number | null = null, daeMs = 0, daeExact: boolean | null = null;
  if (withDae) {
    const t1 = Date.now();
    try { const d = daedalusEncode(text, enc); dae = d.messageTokens; daeExact = d.decoded === text; } catch { dae = null; }
    daeMs = Date.now() - t1;
  }
  const row = {
    file: f, enc, inTokens,
    core: core.messageTokens, coreWire: core.outTokens, coreRules: core.rules, coreMode: core.mode,
    coreExact, coreMs,
    dae, daeMs, daeExact,
    delta: dae == null ? null : core.messageTokens - dae,
  };
  fs.appendFileSync(OUT, JSON.stringify(row) + '\n');
  console.error(`${f.split('/').slice(-2).join('/')} in=${inTokens} core=${core.messageTokens}(${coreMs}ms,${core.rules}r,${core.mode}) dae=${dae}(${daeMs}ms) delta=${row.delta}`);
}
console.error('done');
