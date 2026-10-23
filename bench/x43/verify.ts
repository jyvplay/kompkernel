/**
 * X43 verification — KRISIS against the recorded frontier.
 *
 * Two claims must both hold, and they are checked in the same process:
 *   1. IDENTICAL OUTPUT. krisisEncode must return exactly the messageTokens
 *      recorded for the ungated stack at the end of X42, and decode byte-exact.
 *      A speedup that costs tokens is not pareto-superior, it is a regression.
 *   2. LOWER WALL CLOCK. The gate must actually remove lower-stack encodes.
 *
 * The gate decision and its evidence are printed so a wrong skip is visible
 * rather than hidden behind a matching number.
 */
import { readFileSync, existsSync } from 'node:fs';
import { krisisEncode, krisisDecode } from '@/lib/omega/krisis';
import { chironDecode } from '@/lib/omega/chiron';

const enc: any = 'o200k_base';

// best-known messageTokens at the end of X42 (frontier unchanged from X41)
const FRONTIER: Record<string, number> = {
  'vix-daily-1990.csv': 550, 'aapl-2014.csv': 1407, 'openstack-loghub-26.log': 894,
  'dump.sql': 608, 'git-numstat.txt': 1906, 'find-listing.txt': 1218,
  'ls-full-iso.txt': 366, 'kb-article.txt': 622, 'prose-01.txt': 737,
  'readme.txt': 646, 'bibliography.txt': 667, 'email-thread.txt': 488,
  'chart.svg': 417, 'page.html': 547, 'meeting-transcript.txt': 384,
  'component.jsx': 264, 'pom.xml': 242,
  'prose-02.txt': 789, 'prose-03.txt': 837, 'prose-04.txt': 836,
  'prose-05.txt': 920, 'prose-06.txt': 840, 'prose-07.txt': 809,
};
// X42 measured full-stack wall clock, seconds, for the lanes it timed
const X42_TIME: Record<string, number> = {
  'vix-daily-1990.csv': 814, 'aapl-2014.csv': 418, 'find-listing.txt': 299,
  'ls-full-iso.txt': 609, 'dump.sql': 292, 'page.html': 81, 'bibliography.txt': 42,
  'pom.xml': 129, 'email-thread.txt': 73, 'chart.svg': 35,
  'meeting-transcript.txt': 8, 'component.jsx': 8, 'kb-article.txt': 7,
  'readme.txt': 36, 'prose-01.txt': 8.8, 'prose-03.txt': 328, 'prose-05.txt': 261,
  'prose-02.txt': 27.4, 'prose-04.txt': 37.7, 'prose-06.txt': 51.8, 'prose-07.txt': 34.7,
};

console.log('lane'.padEnd(24) + 'krisis'.padStart(7) + 'front'.padStart(7) + 'match'.padStart(7) +
  ' rt'.padStart(5) + '  time'.padStart(8) + '  x42time'.padStart(9) + ' speedup'.padStart(9) + '  gate(off=)  evidence');

let nMatch = 0, nTot = 0, sumSpeed = 0, nSpeed = 0;
for (const p of (process.env.LANES || '').split(',').map((s) => s.trim()).filter(Boolean)) {
  if (!existsSync(p)) { console.log(`${p} MISSING`); continue; }
  const t = readFileSync(p, 'utf8');
  const nm = p.split('/').pop()!;
  const t0 = Date.now();
  let r: any;
  try { r = krisisEncode(t, enc); } catch (e: any) {
    console.log(nm.padEnd(24) + ' THREW ' + String(e).slice(0, 60)); continue;
  }
  const ms = Date.now() - t0;
  const back = krisisDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  } as any, {
    alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup,
    framing: r.framing, ouraShape: r.ouraShape, ouraMode: r.ouraMode,
    ouraSentinel: r.ouraSentinel, antistrophePair: r.antistrophePair,
    peritropePairs: r.peritropePairs, systoleTemplates: r.systoleTemplates,
    apocopeTemplates: r.apocopeTemplates,
  } as any);
  const rt = back === t;
  const front = FRONTIER[nm];
  const match = front === undefined ? '?' : (r.messageTokens === front ? 'YES' : 'NO');
  if (front !== undefined) { nTot++; if (r.messageTokens === front) nMatch++; }
  const x42 = X42_TIME[nm];
  const sp = x42 ? x42 / (ms / 1000) : NaN;
  if (!isNaN(sp)) { sumSpeed += sp; nSpeed++; }
  const g = r.krisisGate;
  const off = ['oura', 'antistrophe', 'peritrope', 'systole', 'apocope']
    .filter((k) => !(g as any)[k]).map((k) => k.slice(0, 4)).join(',') || 'none';
  const ev = g.evidence;
  console.log(
    nm.padEnd(24) + String(r.messageTokens).padStart(7) +
    String(front ?? '-').padStart(7) + match.padStart(7) +
    (rt ? '  OK' : ' FAIL').padStart(5) +
    ((ms / 1000).toFixed(1) + 's').padStart(8) +
    (x42 ? (x42 + 's') : '-').padStart(9) +
    (isNaN(sp) ? '-' : (sp.toFixed(1) + 'x')).padStart(9) +
    `  off=${off.padEnd(22)}` +
    `ouraEst=${ev.ouraEst} anti=${ev.antiRaw}/${ev.antiClause} peri=${ev.periNet} sys=${ev.sysNet} apo=${ev.apoNet} trials=${ev.trials} gate=${g.gateMs}ms`,
  );
}
console.log(`\nmatch ${nMatch}/${nTot}   mean speedup ${nSpeed ? (sumSpeed / nSpeed).toFixed(1) : '-'}x over ${nSpeed} lanes`);
