// Same-harness comparison: DAEDALUS-D vs LAKONIKOS-D vs SIGE on identical inputs.
import fs from 'node:fs';
import { daedalusDualEncode } from '@/lib/omega/daedalus-dual';
import { lakonikosDualEncode } from '@/lib/omega/lakonikos-d';
import { sigeEncode } from '@/lib/omega/sige';
import { chironDecoderPrompt } from '@/lib/omega/chiron';
import { countTokens } from '@/lib/omega/bpe';
const enc = 'o200k_base' as const;
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const d = daedalusDualEncode(t, enc);
  const s = sigeEncode(t, enc);
  const wire = d.wire;
  const longP = chironDecoderPrompt(wire);
  let l: any;
  try { l = lakonikosDualEncode(t, enc); } catch (e: any) { l = { messageTokens: { o200k_base: -1 }, decoderPrompt: '', error: String(e?.message) }; }
  const sameWire = 'wire' in l ? (l as any).wire === wire : null;
  console.log(JSON.stringify({
    file: f.split('/').pop(), raw: t.length,
    daedalusDual: d.messageTokens.o200k_base, lakonikosD: (l as any).messageTokens?.o200k_base ?? null,
    sige: s.messageTokens, signature: s.contractTokens, longContract: (() => { try { return require('node:module'); } catch { return null; } })() ? undefined : undefined,
    longPromptTokens: (await import('@/lib/omega/bpe')).countTokens(longP, enc),
    sigeContractTokens: s.contractTokens, sigeContractOld: s.contractTokensOld,
    sameWireAsDual: sameWire, lkdChanged: (l as any).changed ?? null, sigeChanged: s.changed,
  }));
}
