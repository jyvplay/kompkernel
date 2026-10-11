// z11: PR-branch codec triage. Generic: runs each module's encode/decode on the 81-file set, reports exact + own message accounting.
import fs from 'node:fs';
import * as F from '@/lib/omega/fold';
import * as P from '@/lib/omega/path';
import * as R from '@/lib/omega/raptor';
import * as RP from '@/lib/omega/replay';
import * as K from '@/lib/omega/krasis';
import * as L from '@/lib/omega/lysis';
import * as PX from '@/lib/omega/pinax';
import * as S from '@/lib/omega/stoicheia';
import * as V from '@/lib/omega/vexilla';
const mods: Record<string, { enc: (t: string, e?: any) => any; dec: (w: string) => string }> = {
  fold: { enc: F.foldEncode, dec: F.foldDecode }, path: { enc: P.pathEncode, dec: P.pathDecode },
  raptor: { enc: R.raptorEncode, dec: R.raptorDecode }, replay: { enc: RP.replayEncode, dec: RP.replayDecode },
  krasis: { enc: K.krasisEncode, dec: K.krasisDecode }, lysis: { enc: L.lysisEncode, dec: L.lysisDecode },
  pinax: { enc: PX.pinaxEncode, dec: PX.pinaxDecode }, stoicheia: { enc: S.stoicheiaEncode, dec: S.stoicheiaDecode },
  vexilla: { enc: V.vexillaEncode, dec: V.vexillaDecode },
};
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const files = fs.readFileSync(process.env.LIST || 'bench/z11/eval-81.txt', 'utf8').split('\n').filter(Boolean);
for (const name of Object.keys(mods)) {
  if (only.length && !only.includes(name)) continue;
  const m = mods[name];
  let n = 0, exact = 0, sumIn = 0, sumMsg = 0, err = 0; const firstKeys: string[] = [];
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    try {
      const r: any = m.enc(t, 'o200k_base');
      if (!firstKeys.length) firstKeys.push(...Object.keys(r));
      const ok = m.dec(r.wire) === t && (r.decoded === undefined || r.decoded === t);
      const msg = r.messageTokens ?? r.deliveredTokens ?? r.outTokens;
      n++; if (ok) exact++; sumIn += r.inTokens ?? 0; sumMsg += msg ?? 0;
    } catch (e: any) { err++; }
  }
  console.log(JSON.stringify({ module: name, files: n, exact, errors: err, sumIn, sumMsg, keys: firstKeys.slice(0, 16) }));
}
