// z11: per-file RAPTOR / REPLAY vs raw, on the 55-file holdout (AMPHORA numbers come from the z10 receipts).
import fs from 'node:fs';
import { raptorEncode, raptorDecode } from '@/lib/omega/raptor';
import { replayEncode, replayDecode } from '@/lib/omega/replay';
const files = fs.readFileSync('bench/z11/corpus-55.txt', 'utf8').split('\n').filter(Boolean);
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const r: any = raptorEncode(t, 'o200k_base'); const p: any = replayEncode(t, 'o200k_base');
  console.log(JSON.stringify({ f, in: r.inTokens, raptor: r.deliveredTokens, raptorOk: raptorDecode(r.wire) === t, replay: p.deliveredTokens, replayOk: replayDecode(p.wire) === t, rMode: r.mode, pMode: p.mode }));
}
