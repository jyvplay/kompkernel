/**
 * X120 — ΒΕΛΤΙΣΤΟΣ (exact chunk state) + ΔΙΓΛΩΣΣΙΑ, balanced A/B on the canonical 29.
 * OFF = the MERGED X118 configuration: OMEGA_VELTISTOS=0, OMEGA_DIGLOSSIA=0.
 * ON  = X120: both on, global pass before local pass.
 * Both arms call the SAME shipped `tagstackEncode` under the pinned audit flags.
 * Arm order is balanced by lane index. Reused from bench/x119/ab.ts (itself
 * reused from bench/x117/ab.ts); only the toggles and the output paths change.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { countTokens, encodeIds } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
import { synedriaReset, synedriaStats } from '../../src/lib/omega/synedria';

const env = { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_ENGRAM: '0',
  OMEGA_OURA_MEMO: '0', OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1',
  OMEGA_SYNEDRIA_CHAIN: '1', OMEGA_ENALLAGE: '1', OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' };
Object.assign(process.env, env);
const enc = 'o200k_base' as const;
const laneFile = process.argv[2] ?? 'bench/x109/lanes29.txt';
const out = process.argv[3] ?? 'bench/x120/receipts/ab';
const lanes = fs.readFileSync(laneFile, 'utf8').split('\n').filter(Boolean);
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const git = (args: string) => { try { return execSync(`git ${args}`, { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } };
fs.mkdirSync('bench/x120/receipts', { recursive: true });
const stream = fs.openSync(out + '.jsonl', 'w');
const msgStream = fs.openSync(out + '-messages.jsonl', 'w');

function run(path: string, on: boolean) {
  process.env.OMEGA_DIGLOSSIA = on ? '1' : '0';
  process.env.OMEGA_VELTISTOS = on ? '1' : '0';
  delete process.env.OMEGA_NO_DIGLOSSIA;
  delete process.env.OMEGA_NO_VELTISTOS;
  delete process.env.OMEGA_VELTISTOS_LADDER;
  delete process.env.OMEGA_VELTISTOS_COLLAPSE;
  delete process.env.OMEGA_COUNT_PREFIX_VERIFY;
  delete process.env.OMEGA_VELTISTOS_WINDOW;
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
    wallMs: dt, cpuMs: (dc.user + dc.system) / 1000, stats: { ...synedriaStats },
    notes: r.notes, message: r.message };
}

const rows: any[] = [];
let exactAll = true, chironAll = true, noWorse = true, samePriceHashStable = true;
let to = 0, tn = 0, offWall = 0, onWall = 0, offCpu = 0, onCpu = 0;
let better = 0, worse = 0, sameTok = 0, unreach = 0, hits = 0, stores = 0, joined = 0;
const start = performance.now();
for (let i = 0; i < lanes.length; i++) {
  const p = lanes[i]!;
  const offFirst = i % 2 === 0;
  let off: ReturnType<typeof run>, on: ReturnType<typeof run>;
  if (offFirst) { off = run(p, false); on = run(p, true); }
  else { on = run(p, true); off = run(p, false); }
  const d = on.tokens - off.tokens;
  to += off.tokens; tn += on.tokens;
  offWall += off.wallMs; onWall += on.wallMs;
  offCpu += off.cpuMs; onCpu += on.cpuMs;
  if (d < 0) {
    better++;
    fs.writeSync(msgStream, JSON.stringify({ path: p, deltaTokens: d, offTokens: off.tokens, onTokens: on.tokens,
      offMessageSHA256: off.messageSHA256, onMessageSHA256: on.messageSHA256, message: on.message }) + '\n');
  } else if (d > 0) { worse++; noWorse = false; } else sameTok++;
  if (d === 0 && off.messageSHA256 !== on.messageSHA256) samePriceHashStable = false;
  hits += on.stats.hits; stores += on.stats.stores; joined += on.stats.joined;
  if (!off.exact || !on.exact || off.tokens !== off.reported || on.tokens !== on.reported) exactAll = false;
  let verdict = d < 0 ? 'TOKEN-WIN' : d === 0 ? 'token-same' : 'TOKEN-LOSS';
  if (!on.hasFrame || !off.hasFrame) { verdict += ' / UNREACHABLE (no § frame)'; unreach++; }
  else if (on.expSHA256 === null || off.expSHA256 === null) { verdict += ' / CHIRON UNREACHABLE'; chironAll = false; }
  const { message: _offMsg, ...offRow } = off;
  const { message: _onMsg, ...onRow } = on;
  const row = { path: p, sourceSHA256: hash(fs.readFileSync(p, 'utf8')), raw: countTokens(fs.readFileSync(p, 'utf8'), enc), off: offRow, on: onRow,
    deltaTokens: d, verdict };
  rows.push(row);
  fs.writeSync(stream, JSON.stringify(row) + '\n');
  console.log(`${p.padEnd(42)} off=${off.tokens} on=${on.tokens} Δ=${d} exact=${off.exact && on.exact} offMs=${off.wallMs.toFixed(0)} onMs=${on.wallMs.toFixed(0)} ${verdict}`);
}
fs.closeSync(stream);
fs.closeSync(msgStream);
const receipt = { schema: 'kompkernel-x120-ab-v1', date: '2026-11-14',
  function: 'tagstackEncode', encoding: enc, environment: env,
  off: { OMEGA_DIGLOSSIA: '0', OMEGA_VELTISTOS: '0' },
  on: { OMEGA_DIGLOSSIA: '1', OMEGA_VELTISTOS: '1' },
  sourceCommit: git('rev-parse HEAD'), branch: git('rev-parse --abbrev-ref HEAD'), dirty: git('status --porcelain'),
  node: process.version, platform: process.platform, arch: process.arch,
  lanes: rows.length, totals: { off: to, on: tn, delta: tn - to, better, worse, same: sameTok,
    offWallMs: offWall, onWallMs: onWall, offCpuMs: offCpu, onCpuMs: onCpu,
    wallSpeedup: offWall / Math.max(1, onWall), cpuSpeedup: offCpu / Math.max(1, onCpu),
    synedriaHits: hits, synedriaStores: stores, synedriaJoined: joined },
  noTokenRegression: noWorse, exact: exactAll, chironReachable: chironAll,
  samePriceHashStable, unreachable: unreach,
  wallMs: performance.now() - start, rows };
fs.writeFileSync(out + '.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(`TOTAL off ${to} on ${tn} ΣΔ ${tn - to} better ${better} worse ${worse} same ${sameTok} noRegression ${noWorse} exact ${exactAll} chironReachable ${chironAll} samePriceHashStable ${samePriceHashStable} unreachable ${unreach}`);
console.log(`WALL off ${(offWall / 1000).toFixed(1)}s on ${(onWall / 1000).toFixed(1)}s speedup ${(offWall / Math.max(1, onWall)).toFixed(3)}x; CPU off ${(offCpu / 1000).toFixed(1)}s on ${(onCpu / 1000).toFixed(1)}s speedup ${(offCpu / Math.max(1, onCpu)).toFixed(3)}x`);
if (!noWorse || !exactAll) process.exitCode = 1;
