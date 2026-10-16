/**
 * X20 lane runner for ANADESMOS: one-chat M of the codec against its own base (LAKONIKOS-D),
 * per lane, with the exactness check and the family bookkeeping. Writes one JSON row per lane to
 * stdout (and to $ND_OUT when set). usage: bench/x20/run.sh bench/x20/nd-lanes.ts <lanes.txt>
 */
import fs from 'node:fs';
import { anadesmosEncode } from '@/lib/omega/anadesmos';
import { countTokens } from '@/lib/omega/bpe';

const list = process.argv[2];
const lanes = fs.readFileSync(list, 'utf8').split('\n').map((x) => x.trim()).filter((x) => x !== '');
const out = process.env.ND_OUT ? fs.openSync(process.env.ND_OUT, 'a') : null;
for (const f of lanes) {
  let text = '';
  try { text = fs.readFileSync(f, 'utf8'); } catch { /* missing lane */ }
  const t0 = Date.now();
  let row: Record<string, unknown>;
  try {
    const r = anadesmosEncode(text, 'o200k_base');
    row = {
      lane: f, inTok: countTokens(text, 'o200k_base'),
      lkd: r.baseTokens.o200k_base, anadesmos: r.messageTokens.o200k_base,
      lkdC: r.baseTokens.cl100k_base, anadesmosC: r.messageTokens.cl100k_base,
      delta: r.messageTokens.o200k_base - r.baseTokens.o200k_base,
      mode: r.mode, applied: r.applied.join('+'), exact: r.decoded === text,
      gain: r.gain, ms: Date.now() - t0, notes: r.notes,
    };
  } catch (e: any) {
    row = { lane: f, error: String(e?.message ?? e).slice(0, 160) };
  }
  const s = JSON.stringify(row);
  fs.appendFileSync('/dev/stdout', s + '\n');
  if (out !== null) fs.writeSync(out, s + '\n');
}
