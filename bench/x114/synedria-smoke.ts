/**
 * X114 SYNEDRIA smoke A/B. Same shipped function (tagstackEncode), pinned audit
 * flags, balanced arm order. The claim is encoder-only: messages, token ids,
 * parent costs and CHIRON expansions must be byte-identical; only time may move.
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
const lanes = fs.readFileSync(process.argv[2] ?? 'bench/x109/lanes29.txt', 'utf8')
  .split('\n').filter(Boolean).slice(0, Number(process.argv[3] ?? 8));
const hash = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

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
    parent: r.parentCodec, messageSHA256: hash(r.message),
    tokenIdsSHA256: hash(JSON.stringify(encodeIds(r.message, enc))),
    expSHA256: exp === null ? null : hash(exp), hasFrame: w >= 0,
    frontierCosts: r.frontierCosts, wallMs: dt, cpuMs: (dc.user + dc.system) / 1000,
    stats: { ...synedriaStats } };
}

const rows: any[] = [];
let ok = true;
for (let i = 0; i < lanes.length; i++) {
  const p = lanes[i]!;
  const offFirst = i % 2 === 0;
  let off: ReturnType<typeof run>, on: ReturnType<typeof run>;
  if (offFirst) { off = run(p, false); on = run(p, true); }
  else { on = run(p, true); off = run(p, false); }
  const same = off.tokens === on.tokens && off.reported === on.reported
    && off.exact && on.exact && off.messageSHA256 === on.messageSHA256
    && off.tokenIdsSHA256 === on.tokenIdsSHA256
    && JSON.stringify(off.frontierCosts) === JSON.stringify(on.frontierCosts)
    && off.expSHA256 === on.expSHA256;
  if (!same) ok = false;
  rows.push({ path: p, off, on, same });
  console.log(`${p.split('/').pop()!.padEnd(22)} off=${off.tokens} on=${on.tokens} exact=${off.exact && on.exact} same=${same} offMs=${off.wallMs.toFixed(0)} onMs=${on.wallMs.toFixed(0)} hits=${on.stats.hits} stores=${on.stats.stores}`);
}
fs.mkdirSync('bench/x114/receipts', { recursive: true });
fs.writeFileSync('bench/x114/receipts/synedria-smoke.json', JSON.stringify({
  schema: 'kompkernel-x114-synedria-smoke-v1', date: '2026-11-14', environment: env,
  encoding: enc, lanes: rows.length, identical: ok, rows,
}, null, 2) + '\n');
console.log(`IDENTICAL ${ok} lanes=${rows.length}`);
if (!ok) process.exitCode = 1;
