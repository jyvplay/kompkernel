// UUIDFOLD alone on the large JSONL files (AMPHORA skipped: too slow for this run). Exact round trip checked.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { uuidfoldEncode, uuidfoldDecode } from '@/lib/omega/uuidfold';
for (const f of ['bench/z11/fold-chiron-55.jsonl', 'bench/z11/hyle-fast-55.jsonl']) {
  const t = fs.readFileSync(f, 'utf8');
  const r = uuidfoldEncode(t, 'o200k_base');
  console.log(JSON.stringify({ f, chars: t.length, uuids: r.uuids, mode: r.mode, identityTok: countTokens(t, 'o200k_base'), uuidfoldTok: r.outTokens, exact: uuidfoldDecode(r.wire) === t }));
}
