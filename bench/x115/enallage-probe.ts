/** X115 ENALLAGE complete-message probe against the X114 baseline incumbents.
 * Calls the real parent frontier on the octal-rewritten text. No timing claim. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { enallageEncode, enallageRewrite, enallageExpand } from '../../src/lib/omega/enallage';
import { tagstackX74Chain } from '../../src/lib/omega/tagstack';

Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1' });
const enc = 'o200k_base' as const;
const baseline = process.argv[2] ?? 'bench/x114/receipts/baseline.jsonl';
const out = process.argv[3] ?? 'bench/x115/receipts/enallage-probe';
const only = process.argv[4]?.split(',') ?? ['ls-l-real', 'ls-real'];
const rows: any[] = [];
fs.mkdirSync('bench/x115/receipts', { recursive: true });
const stream = fs.openSync(out + '.jsonl', 'w');
for (const line of fs.readFileSync(baseline, 'utf8').split('\n').filter(Boolean)) {
  const b = JSON.parse(line);
  if (!only.some(x => b.path.includes(x))) continue;
  const text = fs.readFileSync(b.path, 'utf8');
  const rw = enallageRewrite(text);
  const t = performance.now();
  const useChain = process.argv[5] === 'chain';
  const r = enallageEncode(text, enc, b.tokens, useChain ? ((t, e) => tagstackX74Chain(t, e)) : undefined);
  const dt = performance.now() - t;
  const row = { path: b.path, incumbent: b.tokens, raw: countTokens(text, enc),
    rewriteRaw: rw ? countTokens(rw.wire, enc) : null, hits: rw?.hits ?? 0,
    ownInverse: rw ? enallageExpand(rw.wire) === text : null,
    applied: r.applied, tokens: r.messageTokens, delta: r.messageTokens - b.tokens,
    exact: r.decoded === text, parent: r.frontierParent, notes: r.notes, ms: dt,
    message: r.applied ? r.message : null };
  rows.push(row);
  fs.writeSync(stream, JSON.stringify(row) + '\n');
  console.log(`${b.path} incumbent=${b.tokens} raw=${row.raw}->${row.rewriteRaw} hits=${row.hits} M=${r.messageTokens} Δ=${row.delta} exact=${row.exact} applied=${r.applied} ms=${dt.toFixed(0)} ${r.notes}`);
}
fs.closeSync(stream);
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x115-enallage-probe-v1', date: '2026-11-14', rows }, null, 2) + '\n');
