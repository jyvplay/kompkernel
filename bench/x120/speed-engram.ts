/**
 * X120 speed probe — how much duplicate sub-encode work is there really?
 *
 * The pinned audit flags disable the GLOBAL memos (OMEGA_ENGRAM=0,
 * OMEGA_OURA_MEMO=0, OMEGA_NO_MEMO=1) so that arm 2 cannot inherit arm 1's
 * cache. SYNEDRIA is allowed because its council is scoped to ONE measurement.
 * This probe measures what a scoped DAEDALUS memo could win by turning the
 * existing global ENGRAM on for exactly one lane at a time (cleared between
 * runs), and — critically — compares the message SHA-256, because ENGRAM's key
 * does NOT contain the remaining work budget and a nested hit can therefore
 * return a result computed under a different budget.
 *
 * Run: bash bench/x15/run.sh bench/x120/speed-engram.ts [lanesFile]
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens, type EncodingName } from '../../src/lib/omega/bpe';
import { tagstackEncode, tagstackMemoClear } from '../../src/lib/omega/tagstack';
import { synedriaReset } from '../../src/lib/omega/synedria';
import { engramClear, engramStats, engramSize } from '../../src/lib/omega/engram';

Object.assign(process.env, { OMEGA_DET: '1', OMEGA_NO_MEMO: '1', OMEGA_OURA_MEMO: '0',
  OMEGA_NO_OROTHESIA: '1', OMEGA_SYNEDRIA: '1', OMEGA_SYNEDRIA_CHAIN: '1',
  OMEGA_ENALLAGE: '1', OMEGA_MEKOS: '1', OMEGA_SYNTHESIS: '1' });
const enc: EncodingName = 'o200k_base';
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x120/speed-lanes.txt', 'utf8').split('\n').filter(Boolean);
const rows: any[] = [];
function run(path: string, on: boolean) {
  process.env.OMEGA_ENGRAM = on ? '1' : '0';
  tagstackMemoClear(); synedriaReset(); engramClear();
  const text = fs.readFileSync(path, 'utf8');
  const t = performance.now(), cpu = process.cpuUsage();
  const r = tagstackEncode(text, enc);
  const wallMs = performance.now() - t, c = process.cpuUsage(cpu);
  return { on, tokens: countTokens(r.message, enc), exact: r.decoded === text, sha: hash(r.message),
    wallMs, cpuMs: (c.user + c.system) / 1000, hits: engramStats.hits, misses: engramStats.misses,
    stores: engramStats.stores, size: engramSize(), replayedWork: engramStats.replayedWork };
}
let offWall = 0, onWall = 0, offCpu = 0, onCpu = 0, diff = 0;
for (let i = 0; i < lanes.length; i++) {
  const path = lanes[i];
  const order = i % 2 === 0 ? [false, true] : [true, false];
  const a = run(path, order[0]), b = run(path, order[1]);
  const off = a.on ? b : a, on = a.on ? a : b;
  offWall += off.wallMs; onWall += on.wallMs; offCpu += off.cpuMs; onCpu += on.cpuMs;
  const same = off.sha === on.sha; if (!same) diff++;
  rows.push({ path, off, on, same, speedup: off.wallMs / on.wallMs });
  console.log(`${path.split('/').pop()!.padEnd(22)} off=${Math.round(off.wallMs)}ms/${off.tokens}tok on=${Math.round(on.wallMs)}ms/${on.tokens}tok same=${same} x=${(off.wallMs / on.wallMs).toFixed(3)} hits=${on.hits} misses=${on.misses}`);
}
const summary = { schema: 'kompkernel-x120-speed-engram-v1', lanes: lanes.length, offWall, onWall, offCpu, onCpu,
  wallSpeedup: offWall / onWall, cpuSpeedup: offCpu / onCpu, shaDiffering: diff, rows };
fs.mkdirSync('bench/x120/receipts', { recursive: true });
fs.writeFileSync('bench/x120/receipts/speed-engram.json', JSON.stringify(summary, null, 2) + '\n');
console.log(`TOTAL off=${Math.round(offWall)}ms on=${Math.round(onWall)}ms x=${(offWall / onWall).toFixed(4)} shaDiffering=${diff}`);
