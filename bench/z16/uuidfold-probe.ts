// Per-file measurement: identity vs uuidfold vs AMPHORA vs uuidfold->AMPHORA. Exact round trips checked.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { countTokens } from '@/lib/omega/bpe';
import { uuidfoldEncode, uuidfoldDecode } from '@/lib/omega/uuidfold';
import { amphoraEncode } from '@/lib/omega/amphora';
const files = execSync("grep -rlE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' bench/holdout bench/holdout-ops bench/z11 2>/dev/null || true").toString().trim().split('\n').filter(Boolean);
const rows: any[] = [];
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  if (t.length > 60000) continue;
  const id = countTokens(t, 'o200k_base');
  const u = uuidfoldEncode(t, 'o200k_base');
  const a = amphoraEncode(t, 'o200k_base');
  const aw = a.wire ?? t;
  const ok_a = (a.decoded ?? t) === t;
  const uA = u.mode === 'uuidfold' ? amphoraEncode(u.wire, 'o200k_base') : a;
  const ok_uA = (uA.decoded ?? t) === (u.mode === 'uuidfold' ? u.wire : t);
  rows.push({ f, uuids: u.uuids, mode: u.mode, identity: id, uuidfold: u.outTokens, amphora: countTokens(aw, 'o200k_base'), uuidfold_plus_amphora: countTokens(uA.wire ?? u.wire, 'o200k_base'), exact_uuidfold: u.exact, exact_amphora: ok_a, exact_uf_amph: ok_uA, decodeCheck: uuidfoldDecode(u.wire) === t });
  console.log(JSON.stringify(rows[rows.length - 1]));
}
fs.writeFileSync('bench/z16/uuidfold-probe.json', JSON.stringify(rows, null, 1));
