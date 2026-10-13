// Registry-leader probe on one real document: runs named leader codecs directly (same functions the registry calls).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { aetherEncode } from '@/lib/omega/aether';
import { harmoniaEncode } from '@/lib/omega/harmonia';
import { panaceaEncode } from '@/lib/omega/panacea';
import { noesisEncode } from '@/lib/omega/noesis';
const f = process.env.F as string;
const which = (process.env.WHICH || 'aether').split(',');
const t = fs.readFileSync(f, 'utf8');
const fns: Record<string, (t: string, e: 'o200k_base') => Promise<any>> = {
  aether: aetherEncode, harmonia: harmoniaEncode, panacea: panaceaEncode, noesis: noesisEncode,
};
(async () => {
  for (const w of which) {
    const t0 = Date.now();
    const r = await fns[w](t, 'o200k_base');
    console.log(JSON.stringify({ f, codec: w, in: countTokens(t, 'o200k_base'), msg: r.messageTokens ?? null, exact: r.exact ?? (r.decoded === t), ms: Date.now() - t0, notes: String(r.notes ?? '').slice(0, 200) }));
  }
})();
