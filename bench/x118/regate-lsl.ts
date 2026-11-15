/** X118 repair re-gate: re-measure the ON arm for ls-l-real after the inner-encoder
 * fix (synthesis now prices the fused body through the FULL X74 chain, matching the
 * nested path's wire-level glyph optimizations). The OFF arm and the 28 non-target
 * ON arms are unaffected by the fix (ΣΥΝΘΕΣΙΣ refuses before the inner encode on
 * every non-conjunction domain), so they are carried over from the balanced A/B.
 * This writes a re-gated ab.json; the pre-fix receipt is preserved as ab-prefix.json.
 * Run: bash bench/x15/run.sh bench/x118/regate-lsl.ts
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
import { synedriaReset, synedriaStats } from '../../src/lib/omega/synedria';
const env = { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0', OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1', OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' };
Object.assign(process.env, env);
delete process.env.OMEGA_NO_SYNTHESIS; delete process.env.OMEGA_NO_ENALLAGE; delete process.env.OMEGA_NO_MEKOS;
const enc = 'o200k_base' as const;
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const path = 'bench/holdout-x41/ls-l-real.txt';
const ab = JSON.parse(fs.readFileSync('bench/x117/receipts/ab.json', 'utf8'));
fs.writeFileSync('bench/x117/receipts/ab-prefix.json', JSON.stringify(ab, null, 2) + '\n');
tagstackMemoClear(); synedriaReset();
const text = fs.readFileSync(path, 'utf8');
const t = performance.now(), cpu = process.cpuUsage();
const r = tagstackEncode(text, enc);
const dt = performance.now() - t, dc = process.cpuUsage(cpu);
const actual = countTokens(r.message, enc);
const w = r.message.indexOf(CHIRON_START);
let exp: string | null = null; if (w >= 0) { try { exp = chironDecode(r.message.slice(w)); } catch { exp = null; } }
const on = { on: true, tokens: actual, reported: r.messageTokens, exact: r.decoded === text, parent: r.parentCodec, arm: r.arm, messageSHA256: hash(r.message), tokenIdsSHA256: hash(JSON.stringify(encodeIds(r.message, enc))), expSHA256: exp === null ? null : hash(exp), hasFrame: w >= 0, frontierCosts: r.frontierCosts, frontierReportedCosts: r.frontierReportedCosts, wallMs: dt, cpuMs: (dc.user + dc.system) / 1000, stats: { ...synedriaStats }, notes: r.notes };
const row = ab.rows.find((x: any) => x.path === path);
const off = row.off;
const d = on.tokens - off.tokens;
row.on = on; row.deltaTokens = d;
row.verdict = d < 0 ? 'TOKEN-WIN' : d === 0 ? 'token-same' : 'TOKEN-LOSS';
if (!on.hasFrame || !off.hasFrame) row.verdict += ' / UNREACHABLE (no § frame)';
// recompute totals over all rows
const rows = ab.rows;
const sum = (f: (x: any) => number) => rows.reduce((a: number, x: any) => a + f(x), 0);
const to = sum((x) => x.off.tokens), tn = sum((x) => x.on.tokens);
const better = rows.filter((x: any) => x.deltaTokens < 0).length;
const worse = rows.filter((x: any) => x.deltaTokens > 0).length;
const same = rows.filter((x: any) => x.deltaTokens === 0).length;
const offWall = sum((x) => x.off.wallMs), onWall = sum((x) => x.on.wallMs);
const offCpu = sum((x) => x.off.cpuMs), onCpu = sum((x) => x.on.cpuMs);
ab.totals = { ...ab.totals, off: to, on: tn, delta: tn - to, better, worse, same, offWallMs: offWall, onWallMs: onWall, offCpuMs: offCpu, onCpuMs: onCpu, wallSpeedup: offWall / Math.max(1, onWall), cpuSpeedup: offCpu / Math.max(1, onCpu) };
ab.noTokenRegression = worse === 0;
ab.exact = rows.every((x: any) => x.off.exact && x.on.exact && x.off.tokens === x.off.reported && x.on.tokens === x.on.reported);
ab.samePriceHashStable = rows.every((x: any) => x.deltaTokens !== 0 || x.off.messageSHA256 === x.on.messageSHA256);
ab.regate = { reason: 'synthesis inner-encoder fix: fused body priced through full X74 chain (wire-level glyph opts), not base frontier', prefixReceipt: 'bench/x117/receipts/ab-prefix.json', changedLane: path, offArmUnchanged: true, nonTargetOnArmsUnchanged: true, date: '2026-11-15' };
fs.writeFileSync('bench/x117/receipts/ab.json', JSON.stringify(ab, null, 2) + '\n');
fs.writeFileSync('bench/x118/receipts/regate-lsl.json', JSON.stringify({ path, offTokens: off.tokens, onTokens: on.tokens, delta: d, exact: on.exact, wallMs: dt, cpuMs: on.cpuMs, parent: on.parent, messageSHA256: on.messageSHA256 }, null, 2) + '\n');
fs.writeFileSync('bench/x118/receipts/regate-lsl-message.txt', r.message);
console.log(JSON.stringify({ off: off.tokens, on: on.tokens, delta: d, exact: on.exact, wallMs: Math.round(dt), totals: ab.totals, noTokenRegression: ab.noTokenRegression }, null, 2));
if (!ab.noTokenRegression || !ab.exact) process.exitCode = 1;
