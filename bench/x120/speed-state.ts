/**
 * X120 — WINDOW state vs exact CHUNK state in the ΒΕΛΤΙΣΤΟΣ DP.
 * Both arms price the SAME frozen X118 frontier wires with the SAME shipped
 * module; only `OMEGA_VELTISTOS_WINDOW` varies. Arm order alternates by lane.
 * This is a QUALITY+SPEED comparison, not a pure speedup: the hashes are
 * expected to differ because the state space differs. Exactness is checked
 * against each wire's own CHIRON expansion in both arms.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { countTokens, chunkCacheClear, tailMemoClear } from '../../src/lib/omega/bpe';
import { chironDecode, CHIRON_START } from '../../src/lib/omega/chiron';
import { veltistosEncode } from '../../src/lib/omega/veltistos';
Object.assign(process.env, { OMEGA_DET: '1' });
delete process.env.OMEGA_NO_VELTISTOS; delete process.env.OMEGA_VELTISTOS;
delete process.env.OMEGA_VELTISTOS_LADDER; delete process.env.OMEGA_VELTISTOS_COLLAPSE;
const enc = 'o200k_base' as const;
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');
const src = process.argv[2] ?? 'bench/x119/receipts/frontier.jsonl';
const out = process.argv[3] ?? 'bench/x120/receipts/speed-state';
const rows: any[] = [];
let wMs = 0, cMs = 0, wTok = 0, cTok = 0, bad = 0, better = 0, worse = 0;
const lines = fs.readFileSync(src, 'utf8').trim().split('\n');
for (let i = 0; i < lines.length; i++) {
  const r = JSON.parse(lines[i]!);
  const m: string = r.message;
  const k = m.indexOf(CHIRON_START);
  const ref = k >= 0 ? chironDecode(m.slice(k)) : null;
  const run = (window: boolean) => {
    process.env.OMEGA_VELTISTOS_WINDOW = window ? '1' : '0';
    chunkCacheClear(); tailMemoClear();
    const t = performance.now(), cpu = process.cpuUsage();
    const v = veltistosEncode('', enc, { message: m, messageTokens: countTokens(m, enc), decoded: '' });
    const wallMs = performance.now() - t, c = process.cpuUsage(cpu);
    const kk = v.message.indexOf(CHIRON_START);
    const exp = kk >= 0 ? chironDecode(v.message.slice(kk)) : null;
    return { tokens: countTokens(v.message, enc), wallMs, cpuMs: (c.user + c.system) / 1000,
      edges: v.edges, exact: ref === null || exp === ref, sha: hash(v.message) };
  };
  const wFirst = i % 2 === 0;
  const w = wFirst ? run(true) : run(true);
  const c = wFirst ? run(false) : run(false);
  void wFirst;
  wMs += w.wallMs; cMs += c.wallMs; wTok += w.tokens; cTok += c.tokens;
  if (!w.exact || !c.exact) bad++;
  if (c.tokens < w.tokens) better++; else if (c.tokens > w.tokens) worse++;
  rows.push({ path: r.path, window: w, chunk: c });
  console.log(`${r.path.split('/').pop()!.padEnd(22)} window=${w.tokens}/${Math.round(w.wallMs)}ms chunk=${c.tokens}/${Math.round(c.wallMs)}ms x=${(w.wallMs / Math.max(1, c.wallMs)).toFixed(2)} exact=${w.exact && c.exact}`);
}
const summary = { schema: 'kompkernel-x120-speed-state-v1', lanes: rows.length,
  windowTokens: wTok, chunkTokens: cTok, delta: cTok - wTok, chunkBetter: better, chunkWorse: worse,
  windowWallMs: wMs, chunkWallMs: cMs, wallSpeedup: wMs / Math.max(1, cMs), inexact: bad };
fs.writeFileSync(out + '.json', JSON.stringify({ ...summary, rows }, null, 2) + '\n');
console.log(`TOTAL window=${wTok} chunk=${cTok} Δ=${cTok - wTok} better=${better} worse=${worse} inexact=${bad} wall ${Math.round(wMs)}→${Math.round(cMs)}ms x=${(wMs / Math.max(1, cMs)).toFixed(3)}`);
