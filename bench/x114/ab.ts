/**
 * X114 — SYNEDRIA balanced A/B on the canonical 29 lanes.
 *
 * Both arms call the SAME shipped function, `tagstackEncode`, under the pinned
 * audit flags. The only toggle is OMEGA_SYNEDRIA. Arm order is balanced by lane
 * index. The claim is encoder-only: complete message, token ids, parent costs,
 * and CHIRON-layer expansion must be byte-identical; only wall/CPU may move.
 * A lane with no § frame is UNREACHABLE for the CHIRON comparison, not a mismatch.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
import { synedriaReset, synedriaStats } from '../../src/lib/omega/synedria';

const env = { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0',
  OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1' };
Object.assign(process.env, env);
const enc = 'o200k_base' as const;
const laneFile = process.argv[2] ?? 'bench/x109/lanes29.txt';
const out = process.argv[3] ?? 'bench/x114/receipts/ab';
const lanes = fs.readFileSync(laneFile, 'utf8').split('\n').filter(Boolean);
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
fs.mkdirSync('bench/x114/receipts', { recursive: true });
const stream = fs.openSync(out + '.jsonl', 'w');

function run(path: string, on: boolean) {
  process.env.OMEGA_SYNEDRIA = on ? '1' : '0';
  tagstackMemoClear();
  synedriaReset();
  const text = fs.readFileSync(path, 'utf8');
  const t = performance.now(), cpu = process.cpuUsage();
  const r = tagstackEncode(text, enc);
  const dt = performance.now() - t, dc = process.cpuUsage(cpu);
  const actual = countTokens(r.message, enc);
  const w = r.message.indexOf(CHIRON_START);
  let exp: string | null = null;
  if (w >= 0) { try { exp = chironDecode(r.message.slice(w)); } catch { exp = null; } }
  return { on, tokens: actual, reported: r.messageTokens, exact: r.decoded === text,
    parent: r.parentCodec, arm: r.arm, messageSHA256: hash(r.message),
    tokenIdsSHA256: hash(JSON.stringify(encodeIds(r.message, enc))),
    expSHA256: exp === null ? null : hash(exp), hasFrame: w >= 0,
    frontierCosts: r.frontierCosts, frontierReportedCosts: r.frontierReportedCosts,
    wallMs: dt, cpuMs: (dc.user + dc.system) / 1000, stats: { ...synedriaStats } };
}

const rows: any[] = [];
let identicalAll = true, exactAll = true, chironAll = true;
let to = 0, tn = 0, offWall = 0, onWall = 0, offCpu = 0, onCpu = 0;
let better = 0, worse = 0, sameTok = 0, unreach = 0, hits = 0, stores = 0;
const start = performance.now();
for (let i = 0; i < lanes.length; i++) {
  const p = lanes[i]!;
  const text = fs.readFileSync(p, 'utf8');
  const offFirst = i % 2 === 0;
  let off: ReturnType<typeof run>, on: ReturnType<typeof run>;
  if (offFirst) { off = run(p, false); on = run(p, true); }
  else { on = run(p, true); off = run(p, false); }
  const d = on.tokens - off.tokens;
  to += off.tokens; tn += on.tokens;
  offWall += off.wallMs; onWall += on.wallMs;
  offCpu += off.cpuMs; onCpu += on.cpuMs;
  if (d < 0) better++; else if (d > 0) worse++; else sameTok++;
  hits += on.stats.hits; stores += on.stats.stores;
  const same = off.tokens === on.tokens && off.reported === on.reported
    && off.exact && on.exact && off.messageSHA256 === on.messageSHA256
    && off.tokenIdsSHA256 === on.tokenIdsSHA256 && off.parent === on.parent
    && JSON.stringify(off.frontierCosts) === JSON.stringify(on.frontierCosts)
    && off.expSHA256 === on.expSHA256;
  if (!same) identicalAll = false;
  if (!off.exact || !on.exact || off.tokens !== off.reported || on.tokens !== on.reported) exactAll = false;
  let verdict = same ? 'identical' : 'MISMATCH';
  if (!on.hasFrame || !off.hasFrame) { verdict += ' / UNREACHABLE (no § frame)'; unreach++; }
  else if (on.expSHA256 === null || off.expSHA256 === null || on.expSHA256 !== off.expSHA256) { verdict += ' / CHIRON MISMATCH'; chironAll = false; }
  const row = { path: p, sourceSHA256: hash(text), raw: countTokens(text, enc), off, on,
    deltaTokens: d, identical: same, verdict };
  rows.push(row);
  fs.writeSync(stream, JSON.stringify(row) + '\n');
  console.log(`${p.padEnd(42)} off=${off.tokens} on=${on.tokens} Δ=${d} exact=${off.exact && on.exact} same=${same} offMs=${off.wallMs.toFixed(0)} onMs=${on.wallMs.toFixed(0)} hits=${on.stats.hits} ${verdict}`);
}
fs.closeSync(stream);
const receipt = { schema: 'kompkernel-x114-synedria-ab-v1', date: '2026-11-14',
  function: 'tagstackEncode', encoding: enc, environment: env, toggle: 'OMEGA_SYNEDRIA',
  baseCommit: 'bb2b70b526acc0313db2ca62fa75f5dbbfb5e330', branch: 'arena/4d38410f-kompkernel',
  node: process.version, platform: process.platform, arch: process.arch,
  lanes: rows.length, totals: { off: to, on: tn, delta: tn - to, better, worse, same: sameTok,
    offWallMs: offWall, onWallMs: onWall, offCpuMs: offCpu, onCpuMs: onCpu,
    wallSpeedup: offWall / Math.max(1, onWall), cpuSpeedup: offCpu / Math.max(1, onCpu),
    synedriaHits: hits, synedriaStores: stores },
  identical: identicalAll, exact: exactAll, chironSame: chironAll, unreachable: unreach,
  wallMs: performance.now() - start, rows };
fs.writeFileSync(out + '.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(`TOTAL off ${to} on ${tn} ΣΔ ${tn - to} better ${better} worse ${worse} same ${sameTok} identical ${identicalAll} exact ${exactAll} chironSame ${chironAll} unreachable ${unreach}`);
console.log(`WALL off ${(offWall / 1000).toFixed(1)}s on ${(onWall / 1000).toFixed(1)}s speedup ${(offWall / Math.max(1, onWall)).toFixed(3)}x; CPU off ${(offCpu / 1000).toFixed(1)}s on ${(onCpu / 1000).toFixed(1)}s speedup ${(offCpu / Math.max(1, onCpu)).toFixed(3)}x; hits ${hits} stores ${stores}`);
if (!identicalAll || !exactAll || !chironAll) process.exitCode = 1;
