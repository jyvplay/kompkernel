/** X116 ΜΗΚΟΣ complete-message probe against the X115 shipped incumbents.
 * Calls the real X74 parent chain on the λ-rewritten text. No timing claim. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { mekosEncode, mekosRewrite, mekosExpand, MEKOS_KEY } from '../../src/lib/omega/mekos';
import { tagstackX74Chain, tagstackDecode } from '../../src/lib/omega/tagstack';

Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1', OMEGA_MEKOS: '1' });
const enc = 'o200k_base' as const;
const out = process.argv[2] ?? 'bench/x116/receipts/mekos-probe';
const only = process.argv[3]?.split(',') ?? ['ls-l-real', 'ls-real'];
// Incumbents: X115 ON-arm complete messages. ls-l-real 1352 from the X115 balanced A/B ON-arm (the isolated chain probe was 1353; shipped chain 1352)
// probe receipt; ls-real 430 from the re-verified X114/X115 frontier (ENALLAGE
// floor refuses it, so X115 did not move it).
const incumbent: Record<string, number> = { 'ls-l-real': 1352, 'ls-real': 430 };
const lanes = fs.readFileSync('bench/x109/lanes29.txt', 'utf8').split('\n').filter(Boolean);
const rows: any[] = [];
fs.mkdirSync('bench/x116/receipts', { recursive: true });
const stream = fs.openSync(out + '.jsonl', 'w');
for (const p of lanes) {
  const name = p.split('/').pop()!.replace(/\.txt$/, '');
  if (!only.includes(name)) continue;
  const text = fs.readFileSync(p, 'utf8');
  const rw = mekosRewrite(text);
  const t = performance.now();
  const r = mekosEncode(text, enc, incumbent[name], (t, e) => tagstackX74Chain(t, e));
  const dt = performance.now() - t;
  // The full frontier body needs its own parent decoder (CHIRON/X90/etc.);
  // bare tagstackDecode is only a contract dispatcher. Exactness is r.decoded.
  // Dispatch units cover plain/nested keys with an explicit parent decoder.
  let dispatch: boolean | null = null;
  if (r.applied) { try { dispatch = tagstackDecode(r.message) === text; } catch { dispatch = null; } }
  const row = { path: p, incumbent: incumbent[name], raw: countTokens(text, enc),
    rewriteRaw: rw ? countTokens(rw.wire, enc) : null, hits: rw?.hits ?? 0,
    ownInverse: rw ? mekosExpand(rw.wire) === text : null,
    applied: r.applied, tokens: r.messageTokens, delta: r.messageTokens - incumbent[name]!,
    exact: r.decoded === text, dispatchExact: dispatch === null ? null : dispatch === text,
    parent: r.frontierParent, key: MEKOS_KEY, notes: r.notes, ms: dt,
    message: r.applied ? r.message : null };
  rows.push(row);
  fs.writeSync(stream, JSON.stringify(row) + '\n');
  console.log(`${p} incumbent=${incumbent[name]} raw=${row.raw}->${row.rewriteRaw} hits=${row.hits} M=${r.messageTokens} Δ=${row.delta} exact=${row.exact} dispatch=${row.dispatchExact} applied=${r.applied} ms=${dt.toFixed(0)} ${r.notes}`);
}
fs.closeSync(stream);
fs.writeFileSync(out + '.json', JSON.stringify({ schema: 'kompkernel-x116-mekos-probe-v1', date: '2026-11-14', rows }, null, 2) + '\n');
